import React from "react";
import { Detail } from "@raycast/api";
import { Command, ThinkingKeyword } from "../../types";
import { generateCommandMarkdown } from "../../utils/markdownUtils";

interface DetailContentProps {
  command: Command;
  thinkingKeyword?: ThinkingKeyword;
  actions?: React.ReactNode;
}

export function DetailContent({ command, thinkingKeyword, actions }: DetailContentProps) {
  const markdown = generateCommandMarkdown(command, thinkingKeyword);

  return <Detail markdown={markdown} actions={actions} />;
}
