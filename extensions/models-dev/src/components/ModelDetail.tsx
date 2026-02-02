import { Detail, Icon, Color } from "@raycast/api";
import { Model } from "../lib/types";
import { getCacheTimestamp } from "../lib/api";
import {
  formatPrice,
  formatContextWindow,
  formatModalities,
  formatKnowledgeCutoff,
  formatUpdatedAt,
} from "../lib/formatters";
import { ModelActions } from "./ModelActions";

interface ModelDetailProps {
  model: Model;
}

export function ModelDetail({ model }: ModelDetailProps) {
  const lastUpdated = formatUpdatedAt(getCacheTimestamp());
  const capabilities: string[] = [];
  if (model.reasoning) capabilities.push("Reasoning");
  if (model.tool_call) capabilities.push("Tool Calling");
  if (model.structured_output) capabilities.push("Structured Output");
  if (model.attachment) capabilities.push("Attachments");
  if (model.modalities.input.includes("image")) capabilities.push("Vision");
  if (model.modalities.input.includes("audio")) capabilities.push("Audio Input");
  if (model.modalities.output.includes("audio")) capabilities.push("Audio Output");
  if (model.modalities.input.includes("video")) capabilities.push("Video");
  if (model.modalities.input.includes("pdf")) capabilities.push("PDF");

  const markdown = `
# ${model.name}

${model.status ? `> **Status**: ${model.status.charAt(0).toUpperCase() + model.status.slice(1)}` : ""}

## Capabilities

${capabilities.length > 0 ? capabilities.map((c) => `- ${c}`).join("\n") : "- Text generation"}

## Modalities

- **Input**: ${formatModalities(model.modalities.input)}
- **Output**: ${formatModalities(model.modalities.output)}

${(() => {
  if (!model.cost) return "";
  const rows = [`| Input | ${formatPrice(model.cost.input)} |`, `| Output | ${formatPrice(model.cost.output)} |`];
  if (model.cost.cache_read !== undefined) rows.push(`| Cache Read | ${formatPrice(model.cost.cache_read)} |`);
  if (model.cost.cache_write !== undefined) rows.push(`| Cache Write | ${formatPrice(model.cost.cache_write)} |`);
  if (model.cost.reasoning !== undefined) rows.push(`| Reasoning | ${formatPrice(model.cost.reasoning)} |`);
  return `
## Pricing

| Type | Price (per 1M tokens) |
|------|----------------------|
${rows.join("\n")}

`;
})()}
${(() => {
  if (!model.limit) return "";
  const rows = [`| Context Window | ${formatContextWindow(model.limit.context)} |`];
  if (model.limit.input !== undefined) rows.push(`| Max Input | ${formatContextWindow(model.limit.input)} |`);
  if (model.limit.output !== undefined) rows.push(`| Max Output | ${formatContextWindow(model.limit.output)} |`);
  return `
## Token Limits

| Type | Limit |
|------|-------|
${rows.join("\n")}

`;
})()}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={model.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Provider"
            text={model.providerName}
            icon={{ source: model.providerLogo, fallback: Icon.Globe }}
          />
          <Detail.Metadata.Label title="Model ID" text={model.id} />

          {model.family && <Detail.Metadata.Label title="Family" text={model.family} />}

          <Detail.Metadata.Separator />

          {model.limit?.context && (
            <Detail.Metadata.Label
              title="Context Window"
              text={formatContextWindow(model.limit.context)}
              icon={Icon.MemoryChip}
            />
          )}

          {model.knowledge && (
            <Detail.Metadata.Label
              title="Knowledge Cutoff"
              text={formatKnowledgeCutoff(model.knowledge)}
              icon={Icon.Calendar}
            />
          )}

          {model.release_date && <Detail.Metadata.Label title="Released" text={model.release_date} icon={Icon.Clock} />}

          {lastUpdated && <Detail.Metadata.Label title="Data Updated" text={lastUpdated} icon={Icon.ArrowClockwise} />}

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Features">
            {model.reasoning && <Detail.Metadata.TagList.Item text="Reasoning" color={Color.Yellow} />}
            {model.tool_call && <Detail.Metadata.TagList.Item text="Tools" color={Color.Blue} />}
            {model.structured_output && <Detail.Metadata.TagList.Item text="Structured" color={Color.Magenta} />}
            {model.modalities.input.includes("image") && (
              <Detail.Metadata.TagList.Item text="Vision" color={Color.Purple} />
            )}
            {(model.modalities.input.includes("audio") || model.modalities.output.includes("audio")) && (
              <Detail.Metadata.TagList.Item text="Audio" color={Color.Orange} />
            )}
            {model.open_weights && <Detail.Metadata.TagList.Item text="Open" color={Color.Green} />}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={<ModelActions model={model} showViewDetails={false} />}
    />
  );
}
