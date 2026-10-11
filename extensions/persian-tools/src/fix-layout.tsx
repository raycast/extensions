import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { SOURCE_LABELS, resolveInput } from "./lib/input";
import { convertLayout, detectDirection, type LayoutDirection } from "./lib/layout";

export default function Command(props: LaunchProps<{ arguments: Arguments.FixLayout }>) {
  const { isLoading, data } = usePromise(resolveInput, [props.arguments.text]);

  if (!data) {
    return <List isLoading={isLoading} />;
  }

  const text = data?.text ?? "";
  const hasInput = text.trim().length > 0;

  if (!hasInput) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="Type text, select text, or copy text first" />
      </List>
    );
  }

  const primaryDir = detectDirection(text);
  const oppositeDir: LayoutDirection = primaryDir === "fa2us" ? "us2fa" : "fa2us";

  const directions: LayoutDirection[] = [primaryDir, oppositeDir];

  return (
    <List isLoading={isLoading}>
      {directions.map((dir) => {
        const converted = convertLayout(text, dir);
        const subtitle = dir === "us2fa" ? "English → Persian" : "Persian → English";
        return (
          <List.Item
            key={dir}
            title={converted}
            subtitle={subtitle}
            accessories={[{ text: SOURCE_LABELS[data.source] }]}
            actions={
              <ActionPanel>
                <Action.Paste content={converted} />
                <Action.CopyToClipboard content={converted} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
