import { useEffect, useState } from "react";
import { basename, extname } from "node:path";

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchType,
  Toast,
  getSelectedFinderItems,
  launchCommand,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

import { renderAuthError } from "./lib/auth-ui";
import { formatLoadError, isAuthRelatedError } from "./lib/errors";
import { isLikelyMediaFile, requestUploadUrls } from "./lib/import-media";
import { showErrorToast } from "./lib/toast";
import { addUploadRecord, statusFilePathFor, writeFailedStatus, type UploadRecord } from "./lib/upload-tracker";
import { spawnDetachedUpload } from "./lib/upload-spawn";
import { useProjectSearch } from "./lib/use-project-search";

const NEW_PROJECT_VALUE = "__new__";

type Values = {
  files: string[];
  target: string;
  projectName: string;
  language: string;
};

export default function ImportSelectedMedia() {
  const { pop } = useNavigation();

  const [finderResolved, setFinderResolved] = useState(false);

  const {
    projects,
    isLoading: loadingProjects,
    error: projectsError,
    revalidate: revalidateProjects,
    setSearchText: setProjectSearch,
    recordSelection: recordProjectSelection,
  } = useProjectSearch();

  const { handleSubmit, itemProps, values, setValue, setValidationError, focus } = useForm<Values>({
    initialValues: {
      files: [],
      target: NEW_PROJECT_VALUE,
      projectName: "",
      language: "",
    },
    validation: {
      // `useForm` validators only see their own field's value, so any rule that
      // depends on another field (e.g. "name required when creating a new
      // project") is enforced separately in `onSubmit` via setValidationError.
      files: (value) => {
        const list = (value ?? []).filter((p) => p && p.length > 0);
        if (list.length === 0) return "Choose at least one file to import.";
        const nonMedia = list.filter((p) => !isLikelyMediaFile(p));
        if (nonMedia.length > 0) {
          return `Unsupported file type: ${basename(nonMedia[0])}. Pick audio, video, or image files.`;
        }
      },
    },
    onSubmit: startImport,
  });

  const targetIsNew = values.target === NEW_PROJECT_VALUE;

  // Pre-fill the form from the current Finder selection, but only on first
  // mount and only if it didn't already have files (so a user-initiated
  // re-render doesn't trample their pick).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await getSelectedFinderItems();
        if (cancelled) return;
        const media = items.map((item) => item.path).filter(isLikelyMediaFile);
        if (media.length > 0) {
          setValue("files", media);
          if (!values.projectName) {
            setValue("projectName", defaultProjectName(media));
          }
        }
      } catch {
        // Finder access may be denied or there's no selection — fall back to manual pick.
      } finally {
        if (!cancelled) setFinderResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const authError = renderAuthError(projectsError, revalidateProjects);
  if (authError) return authError;

  async function startImport(form: Values) {
    const validFiles = form.files.filter((path) => path && path.length > 0);
    const isNew = form.target === NEW_PROJECT_VALUE;

    if (isNew && !form.projectName.trim()) {
      setValidationError("projectName", "Give the new project a name.");
      focus("projectName");
      return;
    }

    const targetProject = isNew ? null : projects.find((p) => p.id === form.target);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Requesting upload URLs…",
    });

    let result: Awaited<ReturnType<typeof requestUploadUrls>>;
    try {
      result = await requestUploadUrls({
        filePaths: validFiles,
        projectId: isNew ? undefined : form.target,
        projectName: isNew ? form.projectName.trim() : undefined,
        language: form.language.trim() || undefined,
      });
    } catch (error) {
      await toast.hide();
      await showErrorToast("Could not start import", error);
      return;
    }

    // Persist the tracking record *before* spawning: status file paths are
    // deterministic, so if a spawn fails mid-loop the already-running curl
    // processes are still visible in Recent Jobs / the menu bar instead of
    // becoming untracked background work.
    const record: UploadRecord = {
      id: `${result.job.job_id}-${Date.now()}`,
      jobId: result.job.job_id,
      projectId: result.job.project_id,
      projectUrl: result.job.project_url,
      projectName: isNew ? form.projectName.trim() : (targetProject?.name ?? undefined),
      isExistingProject: !isNew,
      startedAt: new Date().toISOString(),
      files: result.files.map((file) => ({
        fileName: file.fileName,
        filePath: file.filePath,
        fileSize: file.fileSize,
        statusFilePath: statusFilePathFor(result.job.job_id, file.fileName),
      })),
    };

    await addUploadRecord(record);

    let spawnError: unknown = null;
    for (const [index, file] of result.files.entries()) {
      try {
        const { pid } = await spawnDetachedUpload({
          jobId: result.job.job_id,
          fileName: file.fileName,
          filePath: file.filePath,
          signedUrl: file.signedUrl,
          contentType: file.contentType,
        });
        record.files[index].pid = pid;
      } catch (error) {
        spawnError = error;
        // Mark this file failed so the record doesn't sit "pending" forever.
        await writeFailedStatus(record.files[index].statusFilePath);
      }
    }

    // Re-save with the uploader pids so "Stop Upload" can kill the processes.
    await addUploadRecord(record);

    if (spawnError) {
      await toast.hide();
      await showErrorToast("Could not start some uploads", spawnError);
      try {
        await launchCommand({
          name: "descript-activity",
          type: LaunchType.Background,
          context: { reason: "post-job-kickoff" },
        });
      } catch {
        // Menu-bar nudge is best-effort; the next manifest wake will catch up.
      }
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = "Uploads started in the background";
    toast.message =
      validFiles.length === 1
        ? `${basename(validFiles[0])} → ${record.projectName ?? "Descript"}`
        : `${validFiles.length} files → ${record.projectName ?? "Descript"}`;
    toast.primaryAction = {
      title: "Open in Recent Jobs",
      onAction: async () => {
        await launchCommand({ name: "recent-jobs", type: LaunchType.UserInitiated });
      },
    };
    if (record.projectUrl) {
      toast.secondaryAction = {
        title: "Open Project",
        onAction: async () => {
          if (record.projectUrl) await open(record.projectUrl);
        },
      };
    }

    try {
      await launchCommand({
        name: "descript-activity",
        type: LaunchType.Background,
        context: { reason: "post-job-kickoff" },
      });
    } catch {
      // Menu-bar nudge is best-effort; the next manifest wake will catch up.
    }

    pop();
  }

  const filesProps = itemProps.files;
  const targetProps = itemProps.target;
  const projectNameProps = itemProps.projectName;

  return (
    <Form
      isLoading={!finderResolved}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Upload} title="Start Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Files upload in the background. You can dismiss Raycast right after submitting — uploads keep running. Track progress in the menu bar or Recent Jobs." />

      {projectsError && !isAuthRelatedError(projectsError) ? (
        <Form.Description title="Could not load projects" text={formatLoadError(projectsError)} />
      ) : null}

      <Form.FilePicker
        {...filesProps}
        title="Files"
        allowMultipleSelection
        canChooseDirectories={false}
        canChooseFiles
        onChange={(next) => {
          filesProps.onChange?.(next);
          if (values.target === NEW_PROJECT_VALUE && !values.projectName) {
            setValue("projectName", defaultProjectName(next));
          }
        }}
        info="Defaults to the current Finder selection."
      />

      <Form.Dropdown
        {...targetProps}
        title="Target"
        onChange={(value) => {
          targetProps.onChange?.(value);
          if (value !== NEW_PROJECT_VALUE) {
            setValidationError("projectName", undefined);
            recordProjectSelection(value);
          }
        }}
        onSearchTextChange={setProjectSearch}
        throttle
        isLoading={loadingProjects}
        info="Send files to a new project or type to search an existing one."
      >
        <Form.Dropdown.Item value={NEW_PROJECT_VALUE} title="Create new project" icon={Icon.Plus} />
        {projects.length > 0 ? <Form.Dropdown.Section title="Existing projects" /> : null}
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.name || project.id}
            icon={Icon.Document}
          />
        ))}
      </Form.Dropdown>

      {targetIsNew ? <Form.TextField {...projectNameProps} title="Project Name" placeholder="My Project" /> : null}

      <Form.TextField {...itemProps.language} title="Language" placeholder="e.g. en, es (optional)" />
    </Form>
  );
}

function defaultProjectName(filePaths: string[]): string {
  if (!filePaths.length) return "";
  const first = filePaths[0];
  const name = basename(first);
  const ext = extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}
