import type { PropsWithChildren } from "react";

import { Action, ActionPanel } from "@raycast/api";

import type { SimpleWord } from "@/types";

import { useDefaultAction } from "@/hooks/use-settings";

export default function Actions({ word, children }: PropsWithChildren<{ word: SimpleWord }>) {
  const defaultAction = useDefaultAction();
  const pasteAction = <Action.Paste content={word.word} title="Paste Word in Active App" />;
  const copyAction = <Action.CopyToClipboard content={word.word} title="Copy Word to Clipboard" />;

  const [firstAction, secondAction] = defaultAction === "copy" ? [copyAction, pasteAction] : [pasteAction, copyAction];

  return (
    <ActionPanel>
      {firstAction}
      {secondAction}
      {children}
    </ActionPanel>
  );
}
