import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { Example } from "./types/GithubType";
import { useEffect, useState } from "react";
import { getExamples } from "./services/Github";

export default function SearchExamples() {
  const [examples, setExamples] = useState<Example[]>([]);

  useEffect(() => {
    getExamples()
      .then(setExamples)
      .catch((err: string) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Sorry, something went wrong!",
          message: err,
        });
      });
  }, []);

  return (
    <List searchBarPlaceholder="Search examples..." isLoading={examples.length === 0}>
      {examples.map((example) => (
        <List.Item
          key={example.url}
          icon={Icon.TextDocument}
          title={example.name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={example.url} />
              <Action.CopyToClipboard title="Copy URL" content={example.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
