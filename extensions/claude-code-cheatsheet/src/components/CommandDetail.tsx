import React from "react";
import { Command, ThinkingKeyword } from "../types";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { DetailContent, DetailActions } from "./Detail";

interface CommandDetailProps {
  command: Command;
  thinkingKeyword?: ThinkingKeyword;
}

export function CommandDetail({ command, thinkingKeyword }: CommandDetailProps) {
  const { copyToClipboard } = useCopyToClipboard();

  return (
    <DetailContent
      command={command}
      thinkingKeyword={thinkingKeyword}
      actions={<DetailActions command={command} onCopy={copyToClipboard} />}
    />
  );
}
