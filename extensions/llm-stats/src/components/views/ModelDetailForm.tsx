import { Detail, showToast, Toast, Icon, ActionPanel } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ZeroEvalAPI } from "../../utils/zeroeval-api";
import { ORGANIZATION_LOGOS } from "../../utils/organization-logos";
import { ModelDetailsLinkAction } from "../actions/ModelActions";
import { formatParamCount, formatContextSize, formatPrice } from "../../utils/formatting";

interface ModelDetailFormProps {
  modelId: string;
}

const api = new ZeroEvalAPI();

export function ModelDetailForm({ modelId }: ModelDetailFormProps) {
  const {
    data: modelInfo,
    isLoading,
    error,
  } = useCachedPromise(
    async (id: string) => {
      return api.getModelInfo(id);
    },
    [modelId],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load model information",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      },
    },
  );

  if (error) {
    return <Detail markdown={error instanceof Error ? error.message : "Failed to load model information"} />;
  }

  // Build markdown content
  const markdownParts: string[] = [];

  if (modelInfo?.name) {
    markdownParts.push(
      `# ${(modelInfo.organization?.id && typeof ORGANIZATION_LOGOS[modelInfo.organization.id] === "string" ? (ORGANIZATION_LOGOS[modelInfo.organization.id] as string) : null) ? `<img src="${ORGANIZATION_LOGOS[modelInfo.organization.id] as string}" alt="${modelInfo.organization?.name || ""}" width="24" height="24" style="vertical-align: middle;" /> ${modelInfo.name}` : modelInfo.name}`,
    );
  }

  if (modelInfo?.description) {
    markdownParts.push(modelInfo.description);
  }

  // Add benchmarks section if they exist
  if (modelInfo?.benchmarks && modelInfo.benchmarks.length > 0) {
    markdownParts.push("---");
    markdownParts.push("## Benchmarks");

    // Build table with single line breaks
    const tableRows: string[] = [];
    tableRows.push("");
    tableRows.push("| Benchmark | Score |");
    tableRows.push("|-----------|-------|");
    modelInfo.benchmarks.forEach((benchmark) => {
      const benchmarkLink = `[${benchmark.name}](https://llm-stats.com/benchmarks/${benchmark.benchmark_id})`;
      tableRows.push(`| ${benchmarkLink} | ${benchmark.score} |`);
    });
    tableRows.push("");

    // Add table as single block with single line breaks
    markdownParts.push(tableRows.join("\n"));
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdownParts.length > 0 ? markdownParts.join("\n\n") : ""}
      actions={
        <ActionPanel>
          <ModelDetailsLinkAction modelId={modelId} />
        </ActionPanel>
      }
      metadata={
        modelInfo && (
          <Detail.Metadata>
            {/* Context Window, Parameters, Latency Section */}
            {modelInfo?.providers?.[0]?.limits?.max_input_tokens && (
              <>
                <Detail.Metadata.Label
                  title="Context Window"
                  text={formatContextSize(modelInfo.providers[0].limits.max_input_tokens ?? 0)}
                />
                {modelInfo.param_count !== null && (
                  <Detail.Metadata.Label
                    title="Parameters"
                    text={formatParamCount(modelInfo.param_count)}
                    icon={Icon.Calculator}
                  />
                )}
                {modelInfo?.providers?.[0]?.quantization !== null && (
                  <Detail.Metadata.Label
                    title="Quantization"
                    text={modelInfo.providers[0].quantization}
                    icon={Icon.ArrowsContract}
                  />
                )}
                {modelInfo?.providers?.[0]?.performance?.throughput !== null && (
                  <Detail.Metadata.Label
                    title="Throughput"
                    text={`${modelInfo.providers[0].performance.throughput} tokens/second`}
                    icon={Icon.Bolt}
                  />
                )}
                {modelInfo?.providers?.[0]?.performance?.latency !== null && (
                  <Detail.Metadata.Label
                    title="Latency"
                    text={modelInfo.providers[0].performance.latency}
                    icon={Icon.Signal2}
                  />
                )}
                <Detail.Metadata.Separator />
              </>
            )}

            {/* Pricing Section */}
            {modelInfo?.providers?.[0]?.pricing?.input_per_million && (
              <Detail.Metadata.Label
                title="Input Price"
                text={formatPrice(modelInfo.providers[0].pricing.input_per_million)}
              />
            )}
            {modelInfo?.providers?.[0]?.pricing?.output_per_million && (
              <Detail.Metadata.Label
                title="Output Price"
                text={formatPrice(modelInfo.providers[0].pricing.output_per_million)}
              />
            )}
            {modelInfo.license && (
              <Detail.Metadata.Label title="License" text={modelInfo.license.name} icon={Icon.Shield} />
            )}

            {/* Modalities Section */}
            {modelInfo?.providers?.[0]?.modalities && (
              <>
                <Detail.Metadata.Separator />
                {(() => {
                  const inputModalities: Detail.Metadata.TagList.Item.Props[] = [];
                  if (modelInfo.providers[0].modalities.input.text)
                    inputModalities.push({ text: "Text", icon: Icon.Text });
                  if (modelInfo.providers[0].modalities.input.image)
                    inputModalities.push({ text: "Image", icon: Icon.Image });
                  if (modelInfo.providers[0].modalities.input.audio)
                    inputModalities.push({ text: "Audio", icon: Icon.Headphones });
                  if (modelInfo.providers[0].modalities.input.video)
                    inputModalities.push({ text: "Video", icon: Icon.Video });

                  const outputModalities = [];
                  if (modelInfo.providers[0].modalities.output.text)
                    outputModalities.push({ text: "Text", icon: Icon.Text });
                  if (modelInfo.providers[0].modalities.output.image)
                    outputModalities.push({ text: "Image", icon: Icon.Image });
                  if (modelInfo.providers[0].modalities.output.audio)
                    outputModalities.push({ text: "Audio", icon: Icon.Headphones });
                  if (modelInfo.providers[0].modalities.output.video)
                    outputModalities.push({ text: "Video", icon: Icon.Video });

                  return (
                    <>
                      {inputModalities.length > 0 && (
                        <Detail.Metadata.TagList title="Input Modalities">
                          {inputModalities.map((modality) => (
                            <Detail.Metadata.TagList.Item key={modality.text} {...modality} />
                          ))}
                        </Detail.Metadata.TagList>
                      )}
                      {outputModalities.length > 0 && (
                        <Detail.Metadata.TagList title="Output Modalities">
                          {outputModalities.map((modality) => (
                            <Detail.Metadata.TagList.Item key={modality.text} {...modality} />
                          ))}
                        </Detail.Metadata.TagList>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* Dates Section */}
            {(modelInfo.release_date || modelInfo.announcement_date || modelInfo.knowledge_cutoff) && (
              <>
                <Detail.Metadata.Separator />
                {modelInfo.release_date && <Detail.Metadata.Label title="Release Date" text={modelInfo.release_date} />}
                {modelInfo.announcement_date && (
                  <Detail.Metadata.Label title="Announcement Date" text={modelInfo.announcement_date} />
                )}
                {modelInfo.knowledge_cutoff && (
                  <Detail.Metadata.Label title="Knowledge Cutoff" text={modelInfo.knowledge_cutoff} />
                )}
              </>
            )}

            {/* Sources Section */}
            {modelInfo.sources &&
              (() => {
                const sourcesList: React.ReactElement[] = [];

                if (modelInfo.sources.api_ref) {
                  sourcesList.push(
                    <Detail.Metadata.Link
                      key="api_ref"
                      title="API Reference"
                      target={modelInfo.sources.api_ref}
                      text={getHostnameFromUrl(modelInfo.sources.api_ref)}
                    />,
                  );
                }
                if (modelInfo.sources.playground) {
                  sourcesList.push(
                    <Detail.Metadata.Link
                      key="playground"
                      title="Playground"
                      target={modelInfo.sources.playground}
                      text={getHostnameFromUrl(modelInfo.sources.playground)}
                    />,
                  );
                }
                if (modelInfo.sources.paper) {
                  sourcesList.push(
                    <Detail.Metadata.Link
                      key="paper"
                      title="Paper"
                      target={modelInfo.sources.paper}
                      text={getHostnameFromUrl(modelInfo.sources.paper)}
                    />,
                  );
                }
                if (modelInfo.sources.scorecard_blog) {
                  sourcesList.push(
                    <Detail.Metadata.Link
                      key="scorecard_blog"
                      title="Scorecard Blog"
                      target={modelInfo.sources.scorecard_blog}
                      text={getHostnameFromUrl(modelInfo.sources.scorecard_blog)}
                    />,
                  );
                }
                if (modelInfo.sources.repo) {
                  sourcesList.push(
                    <Detail.Metadata.Link
                      key="repo"
                      title="Repository"
                      target={modelInfo.sources.repo}
                      text={getHostnameFromUrl(modelInfo.sources.repo)}
                    />,
                  );
                }
                if (modelInfo.sources.weights) {
                  sourcesList.push(
                    <Detail.Metadata.Link
                      key="weights"
                      title="Weights"
                      target={modelInfo.sources.weights}
                      text={getHostnameFromUrl(modelInfo.sources.weights)}
                    />,
                  );
                }

                return sourcesList.length > 0 ? (
                  <>
                    <Detail.Metadata.Separator />
                    {sourcesList}
                  </>
                ) : null;
              })()}
          </Detail.Metadata>
        )
      }
    />
  );
}

function getHostnameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // If URL parsing fails, return the original URL or a fallback
    return url;
  }
}
