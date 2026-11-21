import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { FileBatch, FinderTag, Mutation } from "../lib/models";
import { mutateFiles } from "../lib/service";

const colors = [
  Color.SecondaryText,
  Color.SecondaryText,
  Color.Green,
  Color.Purple,
  Color.Blue,
  Color.Yellow,
  Color.Red,
  Color.Orange,
];

export function tagColor(tag: FinderTag) {
  return colors[tag.color] ?? Color.SecondaryText;
}
export function tagIcon(tag: FinderTag) {
  return { source: tag.color === 0 ? Icon.Circle : Icon.CircleFilled, tintColor: tagColor(tag) };
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
export function failureText(failures: FileBatch["failures"]) {
  return failures.map((failure) => `${failure.path}\n${failure.message}`).join("\n\n");
}

export function SettingsActions() {
  return (
    <ActionPanel.Section>
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action
        title="Open Automation Settings"
        icon={Icon.Lock}
        onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Automation")}
      />
      <Action
        title="Open Spotlight Settings"
        icon={Icon.MagnifyingGlass}
        onAction={() => open("x-apple.systempreferences:com.apple.Spotlight-Settings.extension")}
      />
    </ActionPanel.Section>
  );
}

export function Warnings({ warnings, failures = [] }: { warnings: string[]; failures?: FileBatch["failures"] }) {
  if (!warnings.length && !failures.length) return null;
  const text = [...warnings, failureText(failures)].filter(Boolean).join("\n\n");
  return (
    <List.Section title="Search & Access Notices">
      <List.Item
        title={failures.length ? `${failures.length} Files Could Not Be Read` : "Search May Be Incomplete"}
        icon={Icon.ExclamationMark}
        subtitle={warnings[0]}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Details"
              icon={Icon.Info}
              target={
                <Detail
                  markdown={text
                    .split("\n")
                    .map((line) => `    ${line}`)
                    .join("\n")}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Details" content={text} />
                      <SettingsActions />
                    </ActionPanel>
                  }
                />
              }
            />
            <SettingsActions />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

export async function performMutation(paths: string[], mutation: Mutation, title: string): Promise<FileBatch> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const result = await mutateFiles(paths, mutation, (done, total) => {
      toast.message = `${done} of ${total} files`;
    });
    const changed = result.files.filter((file) => file.changed).length;
    toast.style = result.failures.length ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = result.failures.length
      ? `${changed} Changed, ${result.failures.length} Failed`
      : `${changed} ${changed === 1 ? "File" : "Files"} Updated`;
    toast.message = result.failures[0]?.message;
    if (result.failures.length)
      toast.primaryAction = {
        title: "Copy Failure Details",
        onAction: () => Clipboard.copy(failureText(result.failures)),
      };
    return result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Update Tags";
    toast.message = errorMessage(error);
    throw error;
  }
}
