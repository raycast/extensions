import { ActionPanel, List } from "@raycast/api";
import { CreateSnippetAction } from "./components/CreateSnippetAction";
import { useSnippet } from "./hooks/useSnippet";

export function SnippetList() {
  const { value, addSnippet } = useSnippet();
  return (
    <List>
      {value?.length === 0 && (
        <List.EmptyView
          icon="😕"
          title="No Snippets Yet, Create the first one"
          actions={
            <ActionPanel>
              <CreateSnippetAction
                onCreate={(code, content) => {
                  addSnippet(code, content);
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {value?.map((v) => {
        return (
          <List.Item
            key={v.code}
            title={v.code}
            subtitle={v.content}
            actions={
              <ActionPanel>
                <CreateSnippetAction
                  onCreate={(code, content) => {
                    addSnippet(code, content);
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
