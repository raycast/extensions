import { Action, ActionPanel, Icon, LaunchProps, LaunchType, List, launchCommand } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Fragment, useState } from "react";
import {
  fetchModelCatalog,
  fetchModelEndpoints,
  formatCompactNumber,
  formatCurrency,
  formatDate,
  getModelPageUrl,
  getProviderIcon,
  type AIGatewayModel,
  type ImagePricingVariant,
  type ModelEndpoint,
  type ModelEndpointDetails,
  type ModelPricing,
  type PricingTier,
  type ServiceTierRate,
  type VideoDurationPricing,
  type VideoCapabilities,
} from "./ai-gateway";

const PER_MILLION = 1_000_000;

interface LaunchContext {
  modelId?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load endpoint details.";
}

function ToggleDetailsAction({ isShowingDetail, onToggle }: { isShowingDetail: boolean; onToggle: () => void }) {
  return (
    <Action
      title={isShowingDetail ? "Hide Details" : "Show Details"}
      icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "d" },
        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
      }}
      onAction={onToggle}
    />
  );
}

function formatTokenPrice(value: string): string {
  const price = Number(value);
  return Number.isFinite(price) ? `${formatCurrency(price * PER_MILLION)} / 1M tokens` : value;
}

function formatPricePer(value: string, multiplier: number, unit: string): string {
  const price = Number(value);
  return Number.isFinite(price) ? `${formatCurrency(price * multiplier)} / ${unit}` : `${value} / ${unit}`;
}

function formatTier(tier: PricingTier): string {
  const range =
    tier.min === undefined && tier.max === undefined
      ? "all usage"
      : `${tier.min === undefined ? "0" : formatCompactNumber(tier.min)}–${
          tier.max === undefined ? "∞" : formatCompactNumber(tier.max)
        } tokens`;
  return `${range}: ${formatTokenPrice(tier.cost)}`;
}

function formatTiers(tiers: PricingTier[] | undefined): string | undefined {
  return tiers?.map(formatTier).join("\n");
}

function imageVariantLabel(variant: ImagePricingVariant): string {
  const descriptor = variant.size ?? variant.quality ?? variant.operation ?? variant.style ?? "Default";
  return `${descriptor.replaceAll("_", " ")}: ${formatPricePer(variant.cost, 1, "image")}`;
}

function formatImageVariants(variants: ImagePricingVariant[] | undefined): string | undefined {
  return variants?.map(imageVariantLabel).join("\n");
}

function videoDurationLabel(variant: VideoDurationPricing): string {
  const descriptors = [
    variant.resolution,
    variant.mode,
    variant.audio === undefined ? undefined : variant.audio ? "audio" : "no audio",
    variant.voiceControl ? "voice control" : undefined,
  ];
  const description = descriptors.filter((value): value is string => value !== undefined).join(" · ") || "Default";
  return `${description}: ${formatPricePer(variant.costPerSecond, 1, "second")}`;
}

function formatVideoDurationPricing(variants: VideoDurationPricing[] | undefined): string | undefined {
  return variants?.map(videoDurationLabel).join("\n");
}

function formatServiceTier(name: string, rate: ServiceTierRate | undefined): string | undefined {
  if (!rate) return undefined;
  const prices = [
    rate.input ? `input ${formatTokenPrice(rate.input)}` : undefined,
    rate.output ? `output ${formatTokenPrice(rate.output)}` : undefined,
    rate.inputCacheRead ? `cache read ${formatTokenPrice(rate.inputCacheRead)}` : undefined,
    rate.inputCacheWrite ? `cache write ${formatTokenPrice(rate.inputCacheWrite)}` : undefined,
  ].filter((value): value is string => value !== undefined);
  return prices.length > 0 ? `${name}: ${prices.join(" · ")}` : undefined;
}

function capabilityTags(capabilities: VideoCapabilities | undefined): string[] {
  if (!capabilities) return [];

  const tags = [
    ...(capabilities.supportedOperations ?? []),
    ...(capabilities.supportedResolutions ?? []),
    ...(capabilities.supportedAspectRatios ?? []),
    ...(capabilities.supportedDurationsSeconds ?? []).map((duration) => `${duration}s`),
    ...(capabilities.supportedFps ?? []).map((fps) => `${fps} FPS`),
  ];
  if (capabilities.generateAudio) tags.push("Audio generation");
  if (capabilities.maxSampleCount !== undefined) tags.push(`${capabilities.maxSampleCount} max samples`);
  return tags;
}

function PricingMetadata({ pricing }: { pricing: ModelPricing | undefined }) {
  if (!pricing) return null;

  const inputTiers = formatTiers(pricing.inputTiers);
  const outputTiers = formatTiers(pricing.outputTiers);
  const cacheReadTiers = formatTiers(pricing.inputCacheReadTiers);
  const cacheWriteTiers = formatTiers(pricing.inputCacheWriteTiers);
  const imageVariants = formatImageVariants(pricing.imageDimensionQualityPricing);
  const videoDurationPricing = formatVideoDurationPricing(pricing.videoDurationPricing);
  const videoTokenPricing = [
    pricing.videoTokenPricing?.noVideoInput
      ? `Without video input: ${formatPricePer(
          pricing.videoTokenPricing.noVideoInput.costPerMillionTokens,
          1,
          "1M tokens",
        )}`
      : undefined,
    pricing.videoTokenPricing?.withVideoInput
      ? `With video input: ${formatPricePer(
          pricing.videoTokenPricing.withVideoInput.costPerMillionTokens,
          1,
          "1M tokens",
        )}`
      : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join("\n");
  const serviceTiers = [
    formatServiceTier("Priority", pricing.serviceTiers?.priority),
    formatServiceTier("Flex", pricing.serviceTiers?.flex),
  ]
    .filter((value): value is string => value !== undefined)
    .join("\n");

  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      {pricing.input && <List.Item.Detail.Metadata.Label title="Input Price" text={formatTokenPrice(pricing.input)} />}
      {pricing.output && (
        <List.Item.Detail.Metadata.Label title="Output Price" text={formatTokenPrice(pricing.output)} />
      )}
      {pricing.inputCacheRead && (
        <List.Item.Detail.Metadata.Label title="Cache Read Price" text={formatTokenPrice(pricing.inputCacheRead)} />
      )}
      {pricing.inputCacheWrite && (
        <List.Item.Detail.Metadata.Label title="Cache Write Price" text={formatTokenPrice(pricing.inputCacheWrite)} />
      )}
      {pricing.webSearch && (
        <List.Item.Detail.Metadata.Label
          title="Web Search Price"
          text={formatPricePer(pricing.webSearch, 1, "request")}
        />
      )}
      {pricing.mapsSearch && (
        <List.Item.Detail.Metadata.Label
          title="Maps Search Price"
          text={formatPricePer(pricing.mapsSearch, 1, "request")}
        />
      )}
      {pricing.image && (
        <List.Item.Detail.Metadata.Label title="Image Price" text={formatPricePer(pricing.image, 1, "image")} />
      )}
      {imageVariants && <List.Item.Detail.Metadata.Label title="Image Pricing" text={imageVariants} />}
      {videoDurationPricing && (
        <List.Item.Detail.Metadata.Label title="Video Duration Pricing" text={videoDurationPricing} />
      )}
      {videoTokenPricing && <List.Item.Detail.Metadata.Label title="Video Token Pricing" text={videoTokenPricing} />}
      {pricing.videoTokenPricing?.notes && (
        <List.Item.Detail.Metadata.Label title="Video Pricing Notes" text={pricing.videoTokenPricing.notes} />
      )}
      {pricing.speechInputCharacterCost && (
        <List.Item.Detail.Metadata.Label
          title="Speech Input Price"
          text={formatPricePer(pricing.speechInputCharacterCost, PER_MILLION, "1M characters")}
        />
      )}
      {pricing.transcriptionDurationCostPerSecond && (
        <List.Item.Detail.Metadata.Label
          title="Transcription Price"
          text={formatPricePer(pricing.transcriptionDurationCostPerSecond, 60, "minute")}
        />
      )}
      {serviceTiers && <List.Item.Detail.Metadata.Label title="Service Tier Pricing" text={serviceTiers} />}
      {inputTiers && <List.Item.Detail.Metadata.Label title="Input Price Tiers" text={inputTiers} />}
      {outputTiers && <List.Item.Detail.Metadata.Label title="Output Price Tiers" text={outputTiers} />}
      {cacheReadTiers && <List.Item.Detail.Metadata.Label title="Cache Read Tiers" text={cacheReadTiers} />}
      {cacheWriteTiers && <List.Item.Detail.Metadata.Label title="Cache Write Tiers" text={cacheWriteTiers} />}
    </>
  );
}

function endpointSummary(endpoint: ModelEndpoint): string | undefined {
  const values = [
    endpoint.contextLength === undefined ? undefined : `${formatCompactNumber(endpoint.contextLength)} context`,
    endpoint.maxCompletionTokens === null || endpoint.maxCompletionTokens === undefined
      ? undefined
      : `${formatCompactNumber(endpoint.maxCompletionTokens)} max output`,
    endpoint.maxPromptTokens === null || endpoint.maxPromptTokens === undefined
      ? undefined
      : `${formatCompactNumber(endpoint.maxPromptTokens)} max input`,
    endpoint.quantization ?? undefined,
  ];
  const summary = values.filter((value): value is string => value !== undefined).join(" · ");
  return summary || undefined;
}

function hasPrice(value: string | undefined): value is string {
  if (value === undefined) return false;
  const price = Number(value);
  return !Number.isFinite(price) || price !== 0;
}

function endpointPricing(endpoint: ModelEndpoint): string {
  const prices: string[] = [];
  const usesSpeechPricing =
    endpoint.pricing.speechInputCharacterCost !== undefined ||
    endpoint.pricing.transcriptionDurationCostPerSecond !== undefined;
  if (!usesSpeechPricing && hasPrice(endpoint.pricing.prompt)) {
    prices.push(`Input ${formatTokenPrice(endpoint.pricing.prompt)}`);
  }
  if (!usesSpeechPricing && hasPrice(endpoint.pricing.completion)) {
    prices.push(`Output ${formatTokenPrice(endpoint.pricing.completion)}`);
  }
  if (hasPrice(endpoint.pricing.inputCacheRead)) {
    prices.push(`Cache read ${formatTokenPrice(endpoint.pricing.inputCacheRead)}`);
  }
  if (hasPrice(endpoint.pricing.inputCacheWrite)) {
    prices.push(`Cache write ${formatTokenPrice(endpoint.pricing.inputCacheWrite)}`);
  }
  if (hasPrice(endpoint.pricing.request)) {
    prices.push(`Request ${formatPricePer(endpoint.pricing.request, 1, "request")}`);
  }
  if (hasPrice(endpoint.pricing.image)) {
    prices.push(`Image input ${formatPricePer(endpoint.pricing.image, 1, "image")}`);
  }
  if (hasPrice(endpoint.pricing.imageOutput)) {
    prices.push(`Image output ${formatPricePer(endpoint.pricing.imageOutput, 1, "image")}`);
  }
  if (hasPrice(endpoint.pricing.webSearch)) {
    prices.push(`Web search ${formatPricePer(endpoint.pricing.webSearch, 1, "request")}`);
  }
  if (hasPrice(endpoint.pricing.internalReasoning)) {
    prices.push(`Internal reasoning ${formatTokenPrice(endpoint.pricing.internalReasoning)}`);
  }
  if (endpoint.pricing.imageDimensionQualityPricing) {
    prices.push(...endpoint.pricing.imageDimensionQualityPricing.map(imageVariantLabel));
  }
  if (endpoint.pricing.videoDurationPricing) {
    prices.push(...endpoint.pricing.videoDurationPricing.map(videoDurationLabel));
  }
  if (endpoint.pricing.videoTokenPricing?.noVideoInput) {
    prices.push(
      `Without video input ${formatPricePer(
        endpoint.pricing.videoTokenPricing.noVideoInput.costPerMillionTokens,
        1,
        "1M tokens",
      )}`,
    );
  }
  if (endpoint.pricing.videoTokenPricing?.withVideoInput) {
    prices.push(
      `With video input ${formatPricePer(
        endpoint.pricing.videoTokenPricing.withVideoInput.costPerMillionTokens,
        1,
        "1M tokens",
      )}`,
    );
  }
  if (endpoint.pricing.speechInputCharacterCost) {
    prices.push(
      `Speech input ${formatPricePer(endpoint.pricing.speechInputCharacterCost, PER_MILLION, "1M characters")}`,
    );
  }
  if (endpoint.pricing.transcriptionDurationCostPerSecond) {
    prices.push(`Transcription ${formatPricePer(endpoint.pricing.transcriptionDurationCostPerSecond, 60, "minute")}`);
  }
  return prices.join("\n") || "Pricing unavailable";
}

function EndpointMetadata({
  modelId,
  details,
  isLoading,
  error,
}: {
  modelId: string;
  details: ModelEndpointDetails | undefined;
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading && !details) {
    return <List.Item.Detail.Metadata.Label title="Provider Endpoints" text="Loading…" />;
  }
  if (error) {
    return <List.Item.Detail.Metadata.Label title="Provider Endpoints" text={errorMessage(error)} />;
  }
  if (!details || details.id !== modelId) {
    return null;
  }
  if (details.endpoints.length === 0) {
    return <List.Item.Detail.Metadata.Label title="Provider Endpoints" text="No endpoints available" />;
  }

  return (
    <>
      {details.endpoints.map((endpoint) => {
        const summary = endpointSummary(endpoint);
        return (
          <Fragment key={`${endpoint.providerName}:${endpoint.name}`}>
            <List.Item.Detail.Metadata.Label
              title={endpoint.providerName}
              text={`${endpoint.name} · ${endpoint.modelName}`}
            />
            {summary && <List.Item.Detail.Metadata.Label title="Limits" text={summary} />}
            <List.Item.Detail.Metadata.Label title="Endpoint Pricing" text={endpointPricing(endpoint)} />
            <List.Item.Detail.Metadata.Label
              title="Status"
              text={endpoint.status === 0 ? "Available" : String(endpoint.status)}
            />
            {endpoint.supportedParameters.length > 0 && (
              <List.Item.Detail.Metadata.TagList title="Supported Parameters">
                {endpoint.supportedParameters.map((parameter) => (
                  <List.Item.Detail.Metadata.TagList.Item key={parameter} text={parameter} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            )}
            {endpoint.tags.length > 0 && (
              <List.Item.Detail.Metadata.TagList title="Endpoint Tags">
                {endpoint.tags.map((tag) => (
                  <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function ModelDetail({
  model,
  endpointDetails,
  endpointIsLoading,
  endpointError,
}: {
  model: AIGatewayModel;
  endpointDetails: ModelEndpointDetails | undefined;
  endpointIsLoading: boolean;
  endpointError: unknown;
}) {
  const modelUrl = getModelPageUrl(model.id);
  const capabilities = capabilityTags(model.videoCapabilities);

  return (
    <List.Item.Detail
      isLoading={endpointIsLoading}
      markdown={model.description}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={model.name} />
          <List.Item.Detail.Metadata.Label title="Model ID" text={model.id} />
          <List.Item.Detail.Metadata.Label title="Owner" text={model.ownedBy} />
          <List.Item.Detail.Metadata.Label title="Type" text={model.type ?? "Unspecified"} />
          <List.Item.Detail.Metadata.Label
            title="Context Window"
            text={model.contextWindow === undefined ? "—" : `${formatCompactNumber(model.contextWindow)} tokens`}
          />
          <List.Item.Detail.Metadata.Label
            title="Max Output"
            text={model.maxTokens === undefined ? "—" : `${formatCompactNumber(model.maxTokens)} tokens`}
          />
          <List.Item.Detail.Metadata.Label
            title="Released"
            text={model.released === undefined ? "—" : formatDate(model.released * 1_000)}
          />
          {model.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {model.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {capabilities.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Capabilities">
              {capabilities.map((capability) => (
                <List.Item.Detail.Metadata.TagList.Item key={capability} text={capability} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <PricingMetadata pricing={model.pricing} />
          <List.Item.Detail.Metadata.Separator />
          <EndpointMetadata
            modelId={model.id}
            details={endpointDetails}
            isLoading={endpointIsLoading}
            error={endpointError}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link title="Model Page" target={modelUrl} text="Open in Vercel" />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command({ launchContext }: LaunchProps<{ launchContext: LaunchContext }>) {
  const initialModelId = launchContext?.modelId?.trim() || undefined;
  const [searchText, setSearchText] = useState(initialModelId ?? "");
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(initialModelId);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { data: catalog, isLoading, error } = useCachedPromise(fetchModelCatalog, [], { keepPreviousData: true });
  const {
    data: endpointDetails,
    isLoading: endpointIsLoading,
    error: endpointError,
  } = useCachedPromise(fetchModelEndpoints, [selectedModelId ?? ""], {
    execute: selectedModelId !== undefined,
    keepPreviousData: true,
  });
  const models = catalog?.data ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      onSelectionChange={(id) => setSelectedModelId(id ?? undefined)}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Search AI Gateway models..."
    >
      {!isLoading && models.length === 0 && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No AI Gateway Models Found"
          description={error ? errorMessage(error) : "The AI Gateway catalog is empty."}
        />
      )}
      {models.map((model) => {
        const modelUrl = getModelPageUrl(model.id);
        const isSelected = selectedModelId === model.id;
        const selectedDetails = endpointDetails?.id === model.id ? endpointDetails : undefined;

        return (
          <List.Item
            key={model.id}
            id={model.id}
            icon={getProviderIcon(model.ownedBy, Icon.Stars)}
            title={model.name}
            subtitle={model.id}
            keywords={[model.id, model.name, model.ownedBy, model.type ?? "", ...model.tags]}
            accessories={model.type ? [{ tag: model.type }] : undefined}
            detail={
              <ModelDetail
                model={model}
                endpointDetails={selectedDetails}
                endpointIsLoading={isSelected && endpointIsLoading}
                endpointError={isSelected ? endpointError : undefined}
              />
            }
            actions={
              <ActionPanel>
                {model.type?.toLocaleLowerCase() === "language" && (
                  <Action
                    icon={Icon.Play}
                    title="Use in AI Gateway Playground"
                    onAction={() =>
                      launchCommand({
                        name: "ai-gateway-playground",
                        type: LaunchType.UserInitiated,
                        context: { modelId: model.id },
                      })
                    }
                  />
                )}
                <Action.OpenInBrowser url={modelUrl} title="Open Model Page" />
                <Action.CopyToClipboard content={model.id} title="Copy Model ID" />
                <ToggleDetailsAction
                  isShowingDetail={isShowingDetail}
                  onToggle={() => setIsShowingDetail((current) => !current)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
