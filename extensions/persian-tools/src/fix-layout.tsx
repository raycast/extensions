import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { SOURCE_LABELS, resolveInput } from "./lib/input";
import { convertLayout, detectDirection, type LayoutDirection } from "./lib/layout";

export default function Command(props: LaunchProps<{ arguments: Arguments.FixLayout }>) {
  const [query, setQuery] = useState("");
  const { isLoading, data } = usePromise(resolveInput, [props.arguments.text]);

  const typed = query.trim().length > 0;
  const text = typed ? query : (data?.text ?? "");
  const source = typed ? "Typed" : data ? SOURCE_LABELS[data.source] : "";
  const hasInput = text.trim().length > 0;

  const primaryDir = detectDirection(text);
  const oppositeDir: LayoutDirection = primaryDir === "fa2us" ? "us2fa" : "fa2us";
  const directions: LayoutDirection[] = [primaryDir, oppositeDir];

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Type text to convert, or use the selection or clipboard"
    >
      {!hasInput ? (
        <List.EmptyView title="Type text above, or select or copy text first" />
      ) : (
        directions.map((dir) => {
          const converted = convertLayout(text, dir);
          return (
            <List.Item
              key={dir}
              title={converted}
              subtitle={dir === "us2fa" ? "English → Persian" : "Persian → English"}
              accessories={source ? [{ text: source }] : undefined}
              actions={
                <ActionPanel>
                  <Action.Paste content={converted} />
                  <Action.CopyToClipboard content={converted} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
