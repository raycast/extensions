import { List, getPreferenceValues, showToast, Toast, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { ModelSettings } from "./util/apiHelper";
import { fetchApiResponseWithUsage } from "./util/apiHelper";
import { useFetch } from "@raycast/utils";

interface PerformanceMetrics {
  modelName: string;
  tokensPerSecond: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timeInSeconds: number;
  isLoading: boolean;
}

export default function PerformanceCommand() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progressIndex, setProgressIndex] = useState(0);
  const progressIndicators = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];
  const preferences = getPreferenceValues<Preferences>();

  const { data: models, isLoading: areModelsLoading } = useFetch<ModelSettings[]>(
    `${preferences.apiUrl}/model-settings`,
    {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + preferences.apiKey,
      },
    },
  );

  // Animation effect for loading indicators
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (metrics.some((m) => m.isLoading)) {
      timer = setInterval(() => {
        setProgressIndex((current) => (current + 1) % progressIndicators.length);
      }, 150);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [metrics, progressIndicators.length]);

  useEffect(() => {
    async function initializeMetrics() {
      const chatModels = models?.filter((model) => model.chat && model.status === "available") || [];

      // Create a toast for the overall testing process
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Running performance tests...",
      });

      // Initialize metrics array with loading states
      setMetrics(
        chatModels.map((model) => ({
          modelName: model.name,
          tokensPerSecond: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          timeInSeconds: 0,
          isLoading: true,
        })),
      );

      // Flag to track when all tests are complete
      let completedTests = 0;

      // Test each model independently
      chatModels.forEach(async (model, index) => {
        try {
          const startTime = performance.now();
          const response = await fetchApiResponseWithUsage(
            "You are a helpful assistant",
            "Generate a short story",
            model.name,
            128,
            undefined, // temperature
            undefined, // frequency_penalty
            undefined, // top_p
            undefined, // presence_penalty
            true, // silent mode - don't show individual toasts
          );
          const endTime = performance.now();
          const timeInSeconds = (endTime - startTime) / 1000;

          // Get token counts from the usage data
          const promptTokens = response.usage?.prompt_tokens || 0;
          const completionTokens = response.usage?.completion_tokens || 0;
          const totalTokens = response.usage?.total_tokens || 0;

          // Update metrics for this specific model
          setMetrics((prevMetrics) => {
            const newMetrics = [...prevMetrics];
            newMetrics[index] = {
              ...newMetrics[index],
              tokensPerSecond: completionTokens > 0 ? completionTokens / timeInSeconds : 0,
              promptTokens,
              completionTokens,
              totalTokens,
              timeInSeconds,
              isLoading: false,
            };
            return newMetrics;
          });
        } catch (error) {
          console.error(`Error testing model ${model.name}:`, error);
          // Handle error case
          setMetrics((prevMetrics) => {
            const newMetrics = [...prevMetrics];
            newMetrics[index] = {
              ...newMetrics[index],
              isLoading: false,
            };
            return newMetrics;
          });
        } finally {
          completedTests++;
          // If all tests are complete, set overall loading to false and update toast
          if (completedTests === chatModels.length) {
            setIsLoading(false);
            toast.style = Toast.Style.Success;
            toast.title = "Performance tests complete!";
          }
        }
      });
    }

    if (models && !areModelsLoading) {
      initializeMetrics();
    }
  }, [models, areModelsLoading]);

  // Function to determine performance rating based on tokens per second
  const getPerformanceRating = (tokensPerSecond: number) => {
    if (tokensPerSecond >= 20) {
      return {
        label: "Excellent",
        color: Color.Green,
        icon: Icon.CircleProgress100,
        tooltip: "High performance: 20+ tokens per second",
      };
    } else if (tokensPerSecond >= 10) {
      return {
        label: "Good",
        color: Color.Blue,
        icon: Icon.CircleProgress75,
        tooltip: "Good performance: 10-20 tokens per second",
      };
    } else if (tokensPerSecond >= 5) {
      return {
        label: "Average",
        color: Color.Yellow,
        icon: Icon.CircleProgress50,
        tooltip: "Average performance: 5-10 tokens per second",
      };
    } else {
      return {
        label: "Slow",
        color: Color.Red,
        icon: Icon.CircleProgress25,
        tooltip: "Slow performance: <5 tokens per second",
      };
    }
  };

  return (
    <List isLoading={isLoading || areModelsLoading} searchBarPlaceholder="Search models...">
      {metrics.map((metric) => {
        const performanceRating = metric.isLoading ? null : getPerformanceRating(metric.tokensPerSecond);

        return (
          <List.Item
            key={metric.modelName}
            title={metric.modelName}
            subtitle={metric.isLoading ? "Running test..." : `${metric.tokensPerSecond.toFixed(2)} tokens/sec`}
            accessories={
              metric.isLoading
                ? [
                    {
                      text: `${progressIndicators[progressIndex]} Testing...`,
                      tooltip: "Running performance test",
                    },
                  ]
                : [
                    {
                      tag: {
                        value: performanceRating?.label || "",
                        color: performanceRating?.color,
                      },
                      icon: performanceRating?.icon,
                      tooltip: performanceRating?.tooltip,
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {metric.isLoading ? (
                      <List.Item.Detail.Metadata.Label title="Status" text="Running performance test..." />
                    ) : (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title="Performance Rating"
                          icon={performanceRating?.icon}
                          text={performanceRating?.label}
                        />
                        <List.Item.Detail.Metadata.TagList title="Rating">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={performanceRating?.label || ""}
                            color={performanceRating?.color}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Tokens per Second"
                          text={`${metric.tokensPerSecond.toFixed(2)}`}
                        />
                        <List.Item.Detail.Metadata.Label title="Time" text={`${metric.timeInSeconds.toFixed(2)}s`} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Prompt Tokens" text={metric.promptTokens.toString()} />
                        <List.Item.Detail.Metadata.Label
                          title="Completion Tokens"
                          text={metric.completionTokens.toString()}
                        />
                        <List.Item.Detail.Metadata.Label title="Total Tokens" text={metric.totalTokens.toString()} />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
