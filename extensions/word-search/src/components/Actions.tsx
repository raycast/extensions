import { Action, ActionPanel } from "@raycast/api";

import type { SimpleWord } from "@/types";

import { useDefaultAction } from "@/hooks/use-settings";

export default function Actions(props: { word: SimpleWord }) {
  const defaultAction = useDefaultAction();
  const pasteAction = <Action.Paste content={props.word.word} title="Paste Word in Active App" />;
  const copyAction = <Action.CopyToClipboard content={props.word.word} title="Copy Word to Clipboard" />;

  const [firstAction, secondAction] = defaultAction === "copy" ? [copyAction, pasteAction] : [pasteAction, copyAction];

  return (
    <ActionPanel>
      {firstAction}
      {secondAction}
    </ActionPanel>
  );
}
