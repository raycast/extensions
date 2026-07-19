import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  LaunchType,
  PopToRootType,
  Toast,
  closeMainWindow,
  environment,
  launchCommand,
  open,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  collectNativeContext,
  formatContext,
  inferProject,
} from "./lib/context";
import {
  classifyAttachment,
  launchThread,
  listProjects,
  makeAttachCommand,
  openThreadInTerminal,
} from "./lib/amp";
import { openScreenRecordingSettings } from "./lib/permissions";
import {
  addTrackedRun,
  clearPendingCaptures,
  getPendingCaptures,
  getRunsDirectory,
  removePendingCaptures,
} from "./lib/storage";
import type {
  AmpMode,
  AmpProject,
  AmpVisibility,
  CaptureEntry,
  NativeContext,
  ThreadAttachment,
  TrackedRun,
} from "./types";

interface FormValues {
  prompt: string;
  projectId: string;
  mode: AmpMode;
  visibility: AmpVisibility;
  attachments: string[];
}

type PostLaunchAction =
  "none" | "browser" | "terminal" | "copy-attach" | "copy-url";

function buildPrompt(
  values: FormValues,
  context: NativeContext,
  captures: CaptureEntry[],
): string {
  const sections = [values.prompt.trim()];
  const native = formatContext(context);
  if (native) sections.push(`<raycast-context>\n${native}\n</raycast-context>`);
  if (captures.length) {
    sections.push(
      `<captured-windows>\n${captures
        .map((capture, index) => {
          const metadata = formatContext(capture.context);
          return `Screenshot ${index + 1}\n${metadata}`;
        })
        .join("\n\n")}\n</captured-windows>`,
    );
  }
  return sections.join("\n\n");
}

const execFileAsync = promisify(execFile);

/**
 * Amp rejects thread content over ~2 MB, and one raw retina window capture
 * already exceeds that as base64. Staged images are recompressed to JPEG at a
 * bounded size; a compression failure falls back to the original file so an
 * odd image degrades to the payload check instead of a lost attachment.
 */
async function compressImage(
  source: string,
  destination: string,
): Promise<string> {
  try {
    const jpegDestination = `${destination.replace(/\.[^.]+$/, "")}.jpg`;
    await execFileAsync(
      "/usr/bin/sips",
      // prettier-ignore
      [
        "-s", "format", "jpeg",
        "-s", "formatOptions", "80",
        "-Z", "1568",
        source,
        "--out", jpegDestination,
      ],
      { timeout: 15_000 },
    );
    return jpegDestination;
  } catch {
    await copyFile(source, destination);
    return destination;
  }
}

/** Small images pass through untouched; big ones get recompressed. */
const IMAGE_COMPRESSION_THRESHOLD_BYTES = 600 * 1024;

/**
 * Copies captures and picked files into the run directory so the thread has a
 * stable snapshot of them. A capture whose file vanished is skipped rather than
 * failing the launch; a file the user picked is not, since they asked for it.
 */
async function stageAttachments(
  runDirectory: string,
  captures: CaptureEntry[],
  picked: string[],
): Promise<{
  captures: CaptureEntry[];
  attachments: ThreadAttachment[];
  skipped: number;
}> {
  const attachmentsDirectory = join(runDirectory, "context", "attachments");
  await mkdir(attachmentsDirectory, { recursive: true });

  const stagedCaptures: CaptureEntry[] = [];
  for (const [index, capture] of captures.entries()) {
    const destination = join(
      attachmentsDirectory,
      `screenshot-${index + 1}${extname(capture.path) || ".png"}`,
    );
    try {
      const staged = await compressImage(capture.path, destination);
      stagedCaptures.push({ ...capture, path: staged });
    } catch {
      continue;
    }
  }

  const stagedPicked = await Promise.all(
    picked.map(async (path, index) => {
      const attachment = await classifyAttachment(path);
      const safeName = basename(path).replaceAll(/[^a-zA-Z0-9._-]/g, "-");
      const destination = join(
        attachmentsDirectory,
        `attachment-${index + 1}-${safeName}`,
      );
      const oversized =
        attachment.kind === "image" &&
        (await stat(path)).size > IMAGE_COMPRESSION_THRESHOLD_BYTES;
      if (oversized) {
        return { ...attachment, path: await compressImage(path, destination) };
      }
      await copyFile(path, destination);
      return { ...attachment, path: destination };
    }),
  );

  return {
    captures: stagedCaptures,
    attachments: [
      ...stagedCaptures.map((capture): ThreadAttachment => ({
        path: capture.path,
        kind: "image",
      })),
      ...stagedPicked,
    ],
    skipped: captures.length - stagedCaptures.length,
  };
}

/**
 * Forms cannot embed images (verified against the full Form API), so full-size
 * screenshot review lives one push away; the form state survives the round
 * trip.
 */
function CapturePreview({ captures }: { captures: CaptureEntry[] }) {
  const markdown = captures
    .map((capture, index) => {
      const title =
        capture.context.window?.title ??
        capture.context.application?.name ??
        `Screenshot ${index + 1}`;
      return `## ${index + 1}. ${title}\n\n![Screenshot ${index + 1}](${pathToFileURL(capture.path).href})`;
    })
    .join("\n\n");
  return (
    <Detail
      navigationTitle="Captured Window"
      markdown={markdown || "No captured windows."}
    />
  );
}

export default function Command() {
  const [projects, setProjects] = useState<AmpProject[]>([]);
  const [captures, setCaptures] = useState<CaptureEntry[]>([]);
  const [context, setContext] = useState<NativeContext>({
    capturedAt: new Date().toISOString(),
  });
  const [selectedProject, setSelectedProject] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([listProjects(), getPendingCaptures()])
      .then(([loadedProjects, loadedCaptures]) => {
        setProjects(loadedProjects);
        setCaptures(loadedCaptures);
      })
      .catch((error) =>
        showToast({
          style: Toast.Style.Failure,
          title: "Could not load Amp",
          message: error instanceof Error ? error.message : String(error),
        }),
      )
      .finally(() => setIsLoading(false));
  }, []);

  // Context collection can take a couple of seconds (browser tab content,
  // selections), so it must not gate the form; it lands whenever it lands.
  useEffect(() => {
    collectNativeContext()
      .then(setContext)
      .catch(() => undefined);
  }, []);

  // Pick a project automatically once projects and context are in, unless the
  // user already chose one.
  useEffect(() => {
    if (selectedProject || !projects.length) return;
    const inferred = inferProject(
      projects,
      captures.at(-1)?.context ?? context,
    );
    if (inferred !== undefined) {
      setSelectedProject(projects[inferred].id);
    } else if (projects.length === 1) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, captures, context, selectedProject]);

  async function submit(
    values: FormValues,
    postLaunchAction: PostLaunchAction,
  ) {
    if (!values.prompt.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a prompt" });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Amp thread…",
    });
    try {
      const project = projects.find(
        (candidate) => candidate.id === values.projectId,
      );
      if (!project) {
        throw new Error(
          "Select an Amp Cloud project. A project is required when running the thread in an Orb.",
        );
      }
      const runId = randomUUID();
      const runsDirectory = await getRunsDirectory();
      const runDirectory = join(runsDirectory, runId);
      await mkdir(runDirectory, { recursive: true });
      const staged = await stageAttachments(
        runDirectory,
        captures,
        values.attachments,
      );
      const run: TrackedRun = {
        runId,
        createdAt: new Date().toISOString(),
        promptPreview: values.prompt.trim().slice(0, 160),
        project,
        mode: values.mode,
        visibility: values.visibility,
        runDirectory,
      };
      await addTrackedRun(run);
      const launched = await launchThread(
        run,
        buildPrompt(values, context, staged.captures),
        staged.attachments,
      );
      await removePendingCaptures(captures.map((capture) => capture.id));

      void launchCommand({
        name: "thread-status",
        type: LaunchType.Background,
      }).catch(() => undefined);

      if (postLaunchAction === "browser") {
        await open(launched.url);
      } else if (postLaunchAction === "terminal") {
        await openThreadInTerminal(environment.supportPath, launched.threadId);
      } else if (postLaunchAction === "copy-attach") {
        await Clipboard.copy(await makeAttachCommand(launched.threadId));
      } else if (postLaunchAction === "copy-url") {
        await Clipboard.copy(launched.url);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Amp thread started";
      toast.message = [
        postLaunchAction === "copy-attach"
          ? "Attach command copied"
          : postLaunchAction === "copy-url"
            ? "Thread URL copied"
            : project.name,
        staged.skipped > 0
          ? `${staged.skipped} expired capture${staged.skipped === 1 ? "" : "s"} skipped`
          : undefined,
      ]
        .filter(Boolean)
        .join(" — ");
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start Amp thread";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="New Amp Thread"
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            title="Start Thread and Open in Browser"
            icon={Icon.Globe}
            onSubmit={(values) => submit(values, "browser")}
          />
          <Action.SubmitForm<FormValues>
            title="Start Thread in Background"
            icon={Icon.Cloud}
            onSubmit={(values) => submit(values, "none")}
          />
          <Action.SubmitForm<FormValues>
            title="Start Thread and Copy URL"
            icon={Icon.Link}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onSubmit={(values) => submit(values, "copy-url")}
          />
          <Action.SubmitForm<FormValues>
            title="Start Thread and Copy Attach Command"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onSubmit={(values) => submit(values, "copy-attach")}
          />
          <Action.SubmitForm<FormValues>
            title="Start Thread and Open in Terminal"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onSubmit={(values) => submit(values, "terminal")}
          />
          {captures.length > 0 ? (
            <Action.Push
              title="Preview Captured Window"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              target={<CapturePreview captures={captures} />}
            />
          ) : null}
          {captures.length > 0 ? (
            <Action
              title="Clear Captured Window"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                await clearPendingCaptures();
                setCaptures([]);
              }}
            />
          ) : null}
          <Action
            title="Open Screen Recording Settings"
            icon={Icon.Gear}
            onAction={openScreenRecordingSettings}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What should Amp do?"
        autoFocus
      />
      <Form.Dropdown
        id="projectId"
        title="Project"
        value={selectedProject}
        onChange={setSelectedProject}
      >
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={`${project.namespace}/${project.name}`}
            icon={Icon.Folder}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="mode" title="Mode" defaultValue="high">
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="ultra" title="Ultra" />
      </Form.Dropdown>
      <Form.Dropdown id="visibility" title="Visibility" defaultValue="private">
        <Form.Dropdown.Item value="private" title="Private" icon={Icon.Lock} />
        <Form.Dropdown.Item
          value="unlisted"
          title="Public Unlisted"
          icon={Icon.Link}
        />
        <Form.Dropdown.Item
          value="workspace"
          title="Workspace"
          icon={Icon.TwoPeople}
        />
        <Form.Dropdown.Item
          value="group"
          title="My Groups"
          icon={Icon.PersonCircle}
        />
      </Form.Dropdown>
      <Form.FilePicker
        id="attachments"
        title="Attachments"
        allowMultipleSelection
        canChooseDirectories={false}
      />
      {captures.length > 0 ? (
        <Form.Description
          title="Captured Window"
          text={captures
            .map((capture) => {
              const parts = [
                capture.context.window?.title,
                capture.context.application?.name,
              ].filter(Boolean);
              return parts.length
                ? `${parts.join(" — ")} (attached)`
                : "Screenshot attached";
            })
            .join("\n")}
        />
      ) : null}
    </Form>
  );
}
