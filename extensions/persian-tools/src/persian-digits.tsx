import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { persianDigitsToEnglish } from "./lib/digits";
import { SOURCE_LABELS, resolveInput } from "./lib/input";

export default function Command(props: LaunchProps<{ arguments: Arguments.PersianDigits }>) {
  const [query, setQuery] = useState("");
  const { isLoading, data } = usePromise(resolveInput, [props.arguments.text]);

  const typed = query.trim().length > 0;
  const text = typed ? query : (data?.text ?? "");
  const source = typed ? "Typed" : data ? SOURCE_LABELS[data.source] : "";
  const converted = persianDigitsToEnglish(text);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Type text to convert, or use the selection or clipboard"
    >
      {text.trim().length === 0 ? (
        <List.EmptyView title="Type text above, or select or copy text first" />
      ) : (
        <List.Item
          title={converted}
          subtitle="Persian → English digits"
          accessories={source ? [{ text: source }] : undefined}
          actions={
            <ActionPanel>
              <Action.Paste content={converted} />
              <Action.CopyToClipboard content={converted} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
