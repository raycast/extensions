import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect } from "react";
import useCommitType from "./hooks/commitType";
import useUrlParser from "./hooks/url_parser";

export default function Command() {
  const { issue, setEntry } = useUrlParser();
  const { commitTypes, filterCommitType } = useCommitType();

  useEffect(() => {
    filterCommitType(issue.type);
  }, [issue.type]);

  return (
    <List
      searchBarPlaceholder="Paste the url of your issue | Add type, description and body with ',' separator"
      searchText={issue.entry}
      onSearchTextChange={setEntry}
    >
      {commitTypes.map((type) => {
        const commitMessage = `${type}(${issue.id ?? issue.url ?? issue.entry}): ${issue.description ?? ""}`;
        const bodyMessage = `Issue url: ${issue.url || ""}${issue.body ? `\n\n${issue.body}` : ""}`;

        return (
          <List.Item
            key={type}
            title={commitMessage}
            actions={
              <ActionPanel>
                <Action.Paste content={commitMessage} />

                <ActionPanel.Section>
                  <Action.Paste
                    content={bodyMessage}
                    title="Paste Description"
                    shortcut={{ modifiers: ["shift"], key: "enter" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
