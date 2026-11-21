import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { basename, dirname } from "node:path";
import { useEffect, useState } from "react";
import { Settings, formatSize } from "./core";
import { Job, cancelJob, isActive } from "./jobs";
import { catalogEncoder, modelCatalog, modelsFolder } from "./models";
import { addToQueue, jobIcon, jobSubtitle, jobToast, useQueue } from "./queue";
import { ToolStatus, homebrew, toolStatus } from "./setup";
import { WhisperModel, saveDefaultModel, whisperModels } from "./whisper";
import { useYtDlpUpdate } from "./ytdlp-update";

const homebrewInstall =
  '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';

/** Tools that aren't installed, checked once when a command opens. */
export function useMissingTools(settings: Settings, names: string[]) {
  const [missing, setMissing] = useState<ToolStatus[]>([]);
  useEffect(() => {
    toolStatus(settings, { versions: false }).then(
      (status) =>
        setMissing(
          status.filter((tool) => names.includes(tool.name) && !tool.path),
        ),
      () => undefined,
    );
  }, []);
  return missing;
}

function useSetupState(settings: Settings) {
  const [state, setState] = useState<{
    tools?: ToolStatus[];
    models?: WhisperModel[];
    defaultModel?: string;
    coreMl?: boolean;
  }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([toolStatus(settings), whisperModels(settings)]).then(
      ([tools, models]) => active && setState({ tools, ...models }),
      () => active && setState({ tools: [], models: [] }),
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  return { ...state, reload: () => setAttempt((value) => value + 1) };
}

/**
 * The tools the extension needs, with Homebrew installs, and whisper models to
 * download, choose as the default, and give Core ML encoders.
 */
export function SetupList({ settings }: { settings: Settings }) {
  const setup = useSetupState(settings);
  const queue = useQueue(settings, (job) => {
    jobToast(job);
    setup.reload();
  });
  const ytDlp = useYtDlpUpdate(settings);
  const brew = homebrew();
  const tools = setup.tools ?? [];
  const missing = tools.filter((tool) => !tool.path);
  const activeJob = (match: (job: Job) => boolean) =>
    queue.jobs.find((job) => isActive(job) && match(job));
  const installing = activeJob((job) => job.spec.kind === "install");
  const folder = settings.supportPath && modelsFolder(settings.supportPath);

  function install(formulas: string[]) {
    addToQueue(settings, [
      {
        title: `Install ${formulas.join(", ")}`,
        spec: { kind: "install", formulas },
      },
    ]);
  }

  const cancel = (job: Job) => (
    <Action
      title="Cancel"
      icon={Icon.XMarkCircle}
      style={Action.Style.Destructive}
      onAction={() => {
        cancelJob(queue.folder, job);
        queue.refresh();
      }}
    />
  );
  const preferences = (
    <Action
      title="Open Extension Preferences"
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );

  const toolItem = (tool: ToolStatus) => {
    const job =
      installing?.spec.kind === "install" &&
      installing.spec.formulas.includes(tool.formula)
        ? installing
        : undefined;
    return (
      <List.Item
        key={tool.name}
        title={tool.name}
        subtitle={job ? jobSubtitle(job) : tool.purpose}
        icon={
          job
            ? jobIcon(job)
            : tool.path
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.Circle, tintColor: Color.Red }
        }
        accessories={
          tool.path
            ? [
                ...(tool.name === "yt-dlp" && ytDlp.outdated
                  ? [
                      {
                        tag: {
                          value: `${ytDlp.latest} available`,
                          color: Color.Orange,
                        },
                      },
                    ]
                  : []),
                {
                  text:
                    tool.version ??
                    (tool.binary === "whisper-cli" && setup.coreMl
                      ? "Core ML build"
                      : "Installed"),
                  tooltip: tool.path,
                },
              ]
            : [
                {
                  tag: {
                    value: job ? "Installing" : "Not installed",
                    color: job ? Color.Blue : Color.Red,
                  },
                },
              ]
        }
        actions={
          <ActionPanel>
            {job && cancel(job)}
            {!tool.path && !job && brew && (
              <Action
                title="Install with Homebrew"
                icon={Icon.Download}
                onAction={() => install([tool.formula])}
              />
            )}
            {!tool.path && !job && brew && missing.length > 1 && (
              <Action
                title="Install All Missing Tools"
                icon={Icon.Download}
                onAction={() => install(missing.map((item) => item.formula))}
              />
            )}
            {tool.name === "yt-dlp" && ytDlp.outdated && (
              <Action
                // yt-dlp is always written in lowercase
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Update yt-dlp"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  await ytDlp.update();
                  setup.reload();
                }}
              />
            )}
            {tool.path && <Action.ShowInFinder path={tool.path} />}
            {tool.path && (
              <Action.CopyToClipboard title="Copy Path" content={tool.path} />
            )}
            {!tool.path && (
              <Action.CopyToClipboard
                title="Copy Install Command"
                content={`brew install ${tool.formula}`}
              />
            )}
            <Action
              title="Check Again"
              icon={Icon.RotateClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={setup.reload}
            />
            {preferences}
          </ActionPanel>
        }
      />
    );
  };

  const installed = setup.models ?? [];
  const catalogNames = new Set(modelCatalog.map((model) => model.name));
  const modelItem = (name: string) => {
    const model = installed.find((item) => item.name === name);
    const info = modelCatalog.find((item) => item.name === name);
    const isDefault = Boolean(model && model.path === setup.defaultModel);
    const job = activeJob(
      (job) =>
        (job.spec.kind === "model" && job.spec.name === name) ||
        (job.spec.kind === "encoder" && job.spec.path === model?.path),
    );
    const encoder = model?.missingEncoder
      ? catalogEncoder(model.name)
      : undefined;
    const ownDownload = Boolean(
      model && folder && dirname(model.path) === folder,
    );
    return (
      <List.Item
        key={model?.path ?? name}
        title={name}
        subtitle={
          job
            ? jobSubtitle(job)
            : (info?.description ??
              (model
                ? dirname(model.path).replace(/^\/Users\/[^/]+/, "~")
                : ""))
        }
        icon={
          job
            ? jobIcon(job)
            : model
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.Download, tintColor: Color.SecondaryText }
        }
        keywords={["whisper", "model"]}
        accessories={[
          ...(isDefault
            ? [{ tag: { value: "Default", color: Color.Blue } }]
            : []),
          ...(model?.missingEncoder
            ? [
                {
                  tag: {
                    value: "Needs Core ML encoder",
                    color: Color.Orange,
                  },
                  tooltip: encoder
                    ? `${formatSize(encoder.size)} download, also downloaded before its first transcription`
                    : `${model.missingEncoder} is missing`,
                },
              ]
            : []),
          {
            text: formatSize(model?.size ?? info?.size ?? 0),
            tooltip: model ? "Installed" : "Download size",
          },
        ]}
        actions={
          <ActionPanel>
            {job && cancel(job)}
            {!model && !job && folder && (
              <Action
                title="Download Model"
                icon={Icon.Download}
                onAction={() =>
                  addToQueue(settings, [
                    { title: name, spec: { kind: "model", name, folder } },
                  ])
                }
              />
            )}
            {model && !isDefault && (
              <Action
                title="Set as Default Model"
                icon={Icon.Star}
                onAction={async () => {
                  if (settings.modelPath) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Default Whisper Model is set in preferences",
                      message:
                        "Clear it in the extension preferences to choose the default here.",
                      primaryAction: {
                        title: "Open Extension Preferences",
                        onAction: openExtensionPreferences,
                      },
                    });
                    return;
                  }
                  saveDefaultModel(settings, model.path);
                  setup.reload();
                  await showToast({
                    style: Toast.Style.Success,
                    title: `${name} is the default model`,
                  });
                }}
              />
            )}
            {model && encoder && !job && (
              <Action
                title="Download Core ML Encoder"
                icon={Icon.Download}
                onAction={() =>
                  addToQueue(settings, [
                    {
                      title: `Core ML encoder for ${encoder.name}`,
                      spec: { kind: "encoder", path: model.path },
                    },
                  ])
                }
              />
            )}
            {model && <Action.ShowInFinder path={model.path} />}
            {model && ownDownload && !isDefault && (
              <Action.Trash
                title="Move Model to Trash"
                paths={[model.path]}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onTrash={setup.reload}
              />
            )}
            <Action
              title="Check Again"
              icon={Icon.RotateClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={setup.reload}
            />
            {preferences}
          </ActionPanel>
        }
      />
    );
  };

  const loading = !setup.tools || !setup.models;
  return (
    <List
      isLoading={loading}
      navigationTitle="Manage Tools and Models"
      searchBarPlaceholder="Filter tools and models"
    >
      {!loading && !brew && missing.length > 0 && (
        <List.Section title="Homebrew">
          <List.Item
            title="Homebrew"
            subtitle="Installs the tools below with one click"
            icon={{ source: Icon.Circle, tintColor: Color.Red }}
            accessories={[
              { tag: { value: "Not installed", color: Color.Red } },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Homebrew Website"
                  url="https://brew.sh"
                />
                <Action.CopyToClipboard
                  title="Copy Homebrew Install Command"
                  content={homebrewInstall}
                />
                <Action
                  title="Check Again"
                  icon={Icon.RotateClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={setup.reload}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section
        title="Tools"
        subtitle={
          loading
            ? undefined
            : missing.length
              ? `${missing.length} not installed`
              : "All installed"
        }
      >
        {tools.map(toolItem)}
      </List.Section>
      {!loading && (
        <List.Section
          title="Whisper Models"
          subtitle={
            setup.defaultModel
              ? `Default: ${basename(setup.defaultModel).replace(/^ggml-|\.bin$/g, "")}`
              : "Download one to transcribe"
          }
        >
          {modelCatalog.map((model) => modelItem(model.name))}
          {installed
            .filter((model) => !catalogNames.has(model.name))
            .map((model) => modelItem(model.name))}
        </List.Section>
      )}
    </List>
  );
}
