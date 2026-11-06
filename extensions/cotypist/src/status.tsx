import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { control } from "./lib/control";
import { Operation } from "./lib/response";
import { useLoad } from "./lib/use-load";

export default function Status() {
  const { data, error, isLoading, refresh } = useLoad(
    () => control("status"),
    "status",
  );
  async function change(operation: Operation) {
    try {
      const state = await control(operation);
      await showToast({
        style: Toast.Style.Success,
        title: `Default completions ${state.defaultEnabled ? "enabled" : "disabled"}`,
        message: state.warnings.join(" ") || undefined,
      });
      await refresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Change Cotypist",
        message:
          error instanceof Error
            ? error.message
            : "The native setting could not be verified.",
      });
    }
  }
  const markdown = error
    ? `# Cotypist Could Not Be Read\n\n${error}`
    : data
      ? `# Default completions are ${data.defaultEnabled ? "enabled" : "disabled"}\n\nThis is Cotypist's native default setting. Apps with their own completion setting keep their individual overrides.\n\n${data.downloadProgress !== undefined ? `The local model is downloading: ${Math.round(data.downloadProgress * 100)}%.` : "Check Cotypist's Setup pane for model readiness and required permissions."}\n\n${data.warnings.join("\n\n")}`
      : "Reading Cotypist's native setting…";
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Default Completions"
              text={data.defaultEnabled ? "Enabled" : "Disabled"}
            />
            <Detail.Metadata.Label
              title="Cotypist Version"
              text={data.version}
            />
            {data.model && (
              <Detail.Metadata.Label title="Selected Model" text={data.model} />
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {data && (
            <Action
              title={
                data.defaultEnabled
                  ? "Disable Default Completions"
                  : "Enable Default Completions"
              }
              icon={data.defaultEnabled ? Icon.Pause : Icon.Play}
              onAction={() =>
                change(
                  data.defaultEnabled ? "disable-default" : "enable-default",
                )
              }
            />
          )}
          {data && (
            <Action
              title="Toggle Default Completions"
              icon={Icon.Switch}
              onAction={() => change("toggle-default")}
            />
          )}
          <Action
            title="Refresh Status"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action
            title="Open Cotypist Shortcuts"
            icon={Icon.Keyboard}
            onAction={() => open("cotypist://showPreferencePane/shortcuts")}
          />
          <Action.OpenInBrowser
            title="Open Cotypist Help"
            url="https://cotypist.app/help/shortcuts"
          />
        </ActionPanel>
      }
    />
  );
}
