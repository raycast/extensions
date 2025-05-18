import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";

export function ErrorMessage(props: { error_message: string }) {
  const { error_message } = props;
  const errorMessage = `### ERROR
${error_message}`;
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={errorMessage}
      actions={
        <ActionPanel>
          <Action title="Back To Form" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
