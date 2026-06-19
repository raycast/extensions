import { Action, ActionPanel, closeMainWindow, List } from "@raycast/api";
import { WRAPPERS, WrapperKey, wrapSelection } from "./lib/wrap";

export default function Command() {
  return (
    <List searchBarPlaceholder="Wrap selection with…">
      {(Object.keys(WRAPPERS) as WrapperKey[]).map((key) => {
        const { open, close, title, icon } = WRAPPERS[key];
        return (
          <List.Item
            key={key}
            icon={icon}
            title={title}
            subtitle={`${open}text${close}`}
            actions={
              <ActionPanel>
                <Action
                  title="Wrap Selection"
                  onAction={async () => {
                    await closeMainWindow();
                    await wrapSelection(key);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
