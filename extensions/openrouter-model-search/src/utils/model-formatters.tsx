import { List, Color } from "@raycast/api";
import { OpenRouterModel } from "../types";
import { getModelIcon } from "../lib/get-icon";
import { MODALITY_TO_ICON } from "../constants/modality-icons";

export function getModelMarkdown(model: OpenRouterModel): string {
  const icon = getModelIcon(model);
  const sanitizedName = (model.name || "Unknown Model").replace(/[<>]/g, "");
  const sanitizedDescription = (model.description || "").replace(/[<>]/g, "");
  const sanitizedIcon = icon ? icon.replace(/"/g, "&quot;") : "";

  return `
## ${sanitizedName} ${sanitizedIcon ? `<img src="${sanitizedIcon}" alt="${sanitizedName}" width="24" height="24" />` : ""}

${sanitizedDescription}
`;
}

export function getModelMetadata(model: OpenRouterModel) {
  const contextLength = model.context_length ?? model.top_provider?.context_length ?? "N/A";
  const maxCompletionTokens = model.top_provider?.max_completion_tokens ?? "N/A";

  // Validate and parse pricing values
  const promptPriceRaw = parseFloat(model.pricing.prompt);
  const completionPriceRaw = parseFloat(model.pricing.completion);
  const promptPrice = Number.isFinite(promptPriceRaw) ? promptPriceRaw * 1000000 : 0; // Convert to per million tokens
  const completionPrice = Number.isFinite(completionPriceRaw) ? completionPriceRaw * 1000000 : 0;

  // Format release date from timestamp with validation
  let releaseDate = "Unknown";
  if (Number.isFinite(model.created)) {
    const date = new Date(model.created * 1000);
    if (!isNaN(date.getTime())) {
      releaseDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Model ID" text={model.id} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Release Date" text={releaseDate} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Pricing (per 1M tokens)">
        <List.Item.Detail.Metadata.TagList.Item color={Color.Blue} text={`In $${promptPrice.toFixed(2)}`} />
        <List.Item.Detail.Metadata.TagList.Item color={Color.Green} text={`Out $${completionPrice.toFixed(2)}`} />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Token Limits">
        <List.Item.Detail.Metadata.TagList.Item color={Color.Blue} text={`In ${contextLength.toLocaleString()}`} />
        <List.Item.Detail.Metadata.TagList.Item
          color={Color.Green}
          text={`Out ${maxCompletionTokens.toLocaleString()}`}
        />
      </List.Item.Detail.Metadata.TagList>
      {(() => {
        const imagePriceRaw = parseFloat(model.pricing.image);
        const imagePrice = Number.isFinite(imagePriceRaw) ? imagePriceRaw : 0;
        return imagePrice > 0 ? (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.TagList title="Image Pricing (per 1K image tokens)">
              <List.Item.Detail.Metadata.TagList.Item
                color={Color.Blue}
                text={`In $${(imagePrice * 1000).toFixed(2)}`}
              />
            </List.Item.Detail.Metadata.TagList>
          </>
        ) : null;
      })()}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Input Modalities">
        {(model.architecture?.input_modalities || []).map((modality) => (
          <List.Item.Detail.Metadata.TagList.Item key={modality} text={modality} icon={MODALITY_TO_ICON[modality]} />
        ))}
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Output Modalities">
        {(model.architecture?.output_modalities || []).map((modality) => (
          <List.Item.Detail.Metadata.TagList.Item key={modality} text={modality} icon={MODALITY_TO_ICON[modality]} />
        ))}
      </List.Item.Detail.Metadata.TagList>
      {model.architecture.instruct_type && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Instruct Type" text={model.architecture.instruct_type} />
        </>
      )}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Tokenizer" text={model.architecture?.tokenizer ?? "Unknown"} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Moderated"
        text={
          model.top_provider?.is_moderated === true
            ? "Yes"
            : model.top_provider?.is_moderated === false
              ? "No"
              : "Unknown"
        }
      />
      {model.hugging_face_id && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Hugging Face"
            target={`https://huggingface.co/${model.hugging_face_id}`}
            text={model.hugging_face_id}
          />
        </>
      )}
      {model.supported_parameters && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Supported Parameters">
            {model.supported_parameters.map((param) => (
              <List.Item.Detail.Metadata.TagList.Item key={param} text={param} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}
