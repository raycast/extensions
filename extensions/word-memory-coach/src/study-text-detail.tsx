import { Action, ActionPanel, Detail } from "@raycast/api";

export function StudyTextDetail(props: { text: string; audioPath?: string }) {
  return (
    <Detail
      markdown={props.text}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={props.text} />
          {props.audioPath ? <Action.Open title="Open Audio File" target={props.audioPath} /> : null}
          {props.audioPath ? <Action.ShowInFinder path={props.audioPath} /> : null}
        </ActionPanel>
      }
    />
  );
}
