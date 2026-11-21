import { useState } from "react";
import { pathToFileURL } from "node:url";
import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { configuration, copyScreenshots, loadScreenshots } from "./native";
import { selectedInHistoryOrder, toggleSelection } from "./selection";

export default function SelectRecent() {
  const config = configuration();
  const { data, isLoading, error, revalidate } = usePromise(loadScreenshots, [config.folder]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);
  const history = data?.screenshots ?? [];
  const chosen = selectedInHistoryOrder(history, selected);

  async function copySelected() {
    if (!chosen.length || copying) return;
    setCopying(true);
    try {
      await copyScreenshots(chosen.map((item) => item.path));
      await closeMainWindow();
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not copy selected screenshots",
        message: String(cause),
      });
      await revalidate();
    } finally {
      setCopying(false);
    }
  }

  function folderActions() {
    return (
      <ActionPanel.Section>
        {data?.folder && <Action.Open title="Open Screenshot Folder" target={data.folder} icon={Icon.Folder} />}
        <Action title="Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
        <Action
          title="Refresh Screenshots"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </ActionPanel.Section>
    );
  }

  return (
    <List
      isLoading={isLoading || copying}
      isShowingDetail={config.previews && history.length > 0}
      navigationTitle={chosen.length > 0 ? `${chosen.length} selected · ⌘↵ to copy` : "↵ to select · ⌘↵ to copy"}
      searchBarPlaceholder="Search screenshots · Return selects · ⌘Return copies"
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.Camera}
        title={error ? "Could Not Read Screenshot Folder" : "No Screenshots Yet"}
        description={
          error
            ? "Check your folder setting and macOS access permission, then refresh."
            : "Take a screenshot or choose another screenshot folder."
        }
        actions={<ActionPanel>{folderActions()}</ActionPanel>}
      />
      {history.map((item) => {
        const isSelected = selected.has(item.path);
        const ordinal = chosen.findIndex((screenshot) => screenshot.path === item.path) + 1;
        return (
          <List.Item
            key={item.path}
            id={item.path}
            title={item.name}
            subtitle={new Date(item.modifiedAt).toLocaleString()}
            icon={config.previews ? { source: item.path } : Icon.Image}
            accessories={[
              {
                icon: isSelected ? Icon.CheckCircle : Icon.Circle,
                text: isSelected ? `#${ordinal}` : undefined,
                tooltip: isSelected ? `Copy order: ${ordinal} (newest first)` : "Not selected",
              },
            ]}
            detail={
              config.previews ? (
                <List.Item.Detail markdown={`![Screenshot](${pathToFileURL(item.path).href})`} />
              ) : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "Deselect Screenshot" : "Select Screenshot"}
                  icon={isSelected ? Icon.MinusCircle : Icon.PlusCircle}
                  onAction={() => setSelected((value) => toggleSelection(value, item.path))}
                />
                {chosen.length > 0 && (
                  <Action
                    title={`Copy ${chosen.length} Selected Screenshot${chosen.length === 1 ? "" : "s"}`}
                    icon={Icon.Clipboard}
                    onAction={copySelected}
                  />
                )}
                <Action.ShowInFinder path={item.path} />
                {folderActions()}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
