import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";

export function ErrorMessage(props: { errorMessage: string }) {
  const { errorMessage } = props;
  const msg = `### ERROR
${errorMessage}`;
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={msg}
      actions={
        <ActionPanel>
          <Action title="Back To Form" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
