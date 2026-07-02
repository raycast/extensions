import { Detail, List } from "@raycast/api";
import capitalize from "capitalize";
import { langMap } from "../runtime/languages";
import { ToolMode } from "../runtime/types";

export interface DetailViewProps {
  showMetadata: boolean;
  text: string;
  error?: string;
  isLoading?: boolean;
  original: string;
  from: string;
  to: string;
  mode: ToolMode;
  toolTitle?: string;
  created_at?: string;
  ocrImg: string | undefined;
  provider: string | undefined;
}

function codeBlock(value: string) {
  const matches = value.match(/`+/g) ?? [];
  const maxFenceLength = matches.reduce((max, match) => Math.max(max, match.length), 0);
  const fence = "`".repeat(Math.max(3, maxFenceLength + 1));
  return `${fence}\n${value}\n${fence}`;
}

function imageMarkdown(path: string | undefined) {
  if (!path) {
    return "";
  }
  return `\n![](<${path.replaceAll(">", "%3E")}>)`;
}

function formatModeTitle(mode: ToolMode) {
  if (mode.startsWith("custom:")) {
    return capitalize(mode.slice("custom:".length).replaceAll("-", " "));
  }
  return capitalize(mode);
}

export const DetailView = (props: DetailViewProps) => {
  const { showMetadata, text, error, isLoading, original, from, to, mode, toolTitle, created_at, ocrImg, provider } =
    props;
  const statusMd = isLoading ? "_Generating..._\n\n" : "";
  const errorMd = error ? `**Error**\n\n${codeBlock(error)}\n\n` : "";
  const imgMd = imageMarkdown(ocrImg);
  return (
    <List.Item.Detail
      markdown={`${statusMd}${errorMd}${text}\n${imgMd}\n\n---\n\n**Original**\n\n${codeBlock(original)}\n`}
      metadata={
        showMetadata ? (
          <Detail.Metadata>
            {mode != "what" ? <Detail.Metadata.Label title="From" text={`${langMap.get(from) || "Auto"}`} /> : null}
            <Detail.Metadata.Label title="To" text={`${langMap.get(to)}`} />
            <Detail.Metadata.Label title="Tool" text={toolTitle ?? formatModeTitle(mode)} />
            {created_at && <Detail.Metadata.Label title="Created At" text={`${created_at}`} />}
            {provider && <Detail.Metadata.Label title="Runtime" text={provider} />}
          </Detail.Metadata>
        ) : null
      }
    />
  );
};
