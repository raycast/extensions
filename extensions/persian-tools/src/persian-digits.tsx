import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { persianDigitsToEnglish } from "./lib/digits";
import { SOURCE_LABELS, resolveInput } from "./lib/input";

export default function Command(props: LaunchProps<{ arguments: Arguments.PersianDigits }>) {
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

  const converted = persianDigitsToEnglish(text);

  return (
    <List isLoading={isLoading}>
      <List.Item
        title={converted}
        subtitle="Persian → English"
        accessories={[{ text: SOURCE_LABELS[data.source] }]}
        actions={
          <ActionPanel>
            <Action.Paste content={converted} />
            <Action.CopyToClipboard content={converted} />
          </ActionPanel>
        }
      />
    </List>
  );
}
