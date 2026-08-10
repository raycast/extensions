import React from "react";
import { Detail } from "@raycast/api";
import { ManifestType } from "../utils/types";
import { createMarkdown, getSyntaxLanguage, truncateContent } from "../utils/formatting";

interface ManifestContentViewProps {
  content: string;
  manifestType: ManifestType;
  isLoading: boolean;
  actions: React.ReactElement;
}

export default function ManifestContentView({ content, manifestType, isLoading, actions }: ManifestContentViewProps) {
  const syntaxLanguage = getSyntaxLanguage(manifestType);
  const markdown = createMarkdown(truncateContent(content), syntaxLanguage);

  return <Detail isLoading={isLoading} markdown={markdown} actions={actions} />;
}
