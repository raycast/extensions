import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { allTabs, link, shown } from "./nextterm";

const marks: Record<string, { source: Icon; tintColor: Color; tooltip: string }> = {
  attention: { source: Icon.ExclamationMark, tintColor: Color.Orange, tooltip: "Waits for you" },
  working: { source: Icon.CircleProgress50, tintColor: Color.Blue, tooltip: "Working" },
  done: { source: Icon.CheckCircle, tintColor: Color.Green, tooltip: "Done" },
  failed: { source: Icon.XMarkCircle, tintColor: Color.Red, tooltip: "Failed" },
};

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(allTabs);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Go to a Next Term tab">
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Next Term didn't answer" description={error.message} />
      ) : null}
      {(data ?? []).map((tab) => {
        const mark = tab.state ? marks[tab.state] : undefined;
        return (
          <List.Item
            key={tab.id}
            icon={tab.agent ? Icon.Stars : Icon.Terminal}
            title={tab.title}
            subtitle={tab.question ?? shown(tab.directory)}
            keywords={[tab.window, tab.program ?? "", tab.directory]}
            accessories={[{ text: tab.window }, ...(mark ? [{ icon: mark, tooltip: mark.tooltip }] : [])]}
            actions={
              <ActionPanel>
                <Action title="Go to Tab" icon={Icon.ArrowRight} onAction={() => link("tab", { id: tab.id })} />
                <Action.CopyToClipboard title="Copy Folder" content={tab.directory} />
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
