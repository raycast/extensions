import { Action, ActionPanel, Detail } from "@raycast/api";

type CreateSnippetErrorProps = {
  actionProps?: Partial<Action.Props>;
};
export default function CreateError(props: CreateSnippetErrorProps) {
  const { actionProps = { title: "Try Again" } } = props;
  if (!actionProps.title) actionProps.title = "Try Again";
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action {...actionProps} />
        </ActionPanel>
      }
      markdown={`# ⚠️ Error Creating Snippet
Ensure you have valid FileMaker objects copied to the clipboard, then run this command again.`}
    />
  );
}
