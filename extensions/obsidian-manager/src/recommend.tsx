import { ActionPanel, Action, List, Detail, Form, showToast, Toast, useNavigation, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { useCachedState } from "@raycast/utils";
import { analyzeVault, analyzeSpecificArea, VaultAnalysis, Recommendation } from "./lib/recommend";

export default function Command() {
  const { push } = useNavigation();
  const [cachedAnalysis, setCachedAnalysis] = useCachedState<VaultAnalysis | null>("vault-analysis", null);
  const [isLoading, setIsLoading] = useState(false);

  async function runFullAnalysis() {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Analyzing vault...",
      message: "This may take a moment",
    });

    try {
      const analysis = await analyzeVault();
      setCachedAnalysis(analysis);
      toast.style = Toast.Style.Success;
      toast.title = "Analysis Complete";
      toast.message = `Found ${analysis.recommendations.length} recommendations`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Analysis Failed";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      setIsLoading(false);
    }
  }

  function focusedAnalysis() {
    push(<FocusedAnalysisForm />);
  }

  function viewRecommendation(rec: Recommendation) {
    push(<RecommendationDetail recommendation={rec} />);
  }

  function getTypeIcon(type: Recommendation["type"]): { source: Icon; tintColor: Color } {
    switch (type) {
      case "gap":
        return { source: Icon.PlusCircle, tintColor: Color.Red };
      case "shallow":
        return { source: Icon.Layers, tintColor: Color.Orange };
      case "connection":
        return { source: Icon.Link, tintColor: Color.Blue };
      case "question":
        return { source: Icon.QuestionMark, tintColor: Color.Purple };
      case "source":
        return { source: Icon.Book, tintColor: Color.Green };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  }

  function getPriorityColor(priority: Recommendation["priority"]): Color {
    switch (priority) {
      case "high":
        return Color.Red;
      case "medium":
        return Color.Orange;
      case "low":
        return Color.SecondaryText;
    }
  }

  const highPriority = cachedAnalysis?.recommendations.filter((r) => r.priority === "high") || [];
  const mediumPriority = cachedAnalysis?.recommendations.filter((r) => r.priority === "medium") || [];
  const lowPriority = cachedAnalysis?.recommendations.filter((r) => r.priority === "low") || [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter recommendations..."
      navigationTitle="Vault Recommendations"
    >
      <List.Section title="Actions">
        <List.Item
          title="Analyze Entire Vault"
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          subtitle="Find gaps, shallow areas, and missing connections"
          accessories={
            cachedAnalysis ? [{ text: `${cachedAnalysis.recommendations.length} recommendations cached` }] : []
          }
          actions={
            <ActionPanel>
              <Action title="Run Analysis" icon={Icon.Play} onAction={runFullAnalysis} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Analyze Specific Area"
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Purple }}
          subtitle="Focus analysis on a particular topic"
          actions={
            <ActionPanel>
              <Action title="Choose Focus Area" icon={Icon.MagnifyingGlass} onAction={focusedAnalysis} />
            </ActionPanel>
          }
        />
      </List.Section>

      {cachedAnalysis && (
        <>
          <List.Section title="Vault Summary">
            <List.Item
              title={cachedAnalysis.summary}
              icon={Icon.Info}
              accessories={[{ text: `${cachedAnalysis.topicsCovered.length} topics covered` }]}
            />
          </List.Section>

          {highPriority.length > 0 && (
            <List.Section title="High Priority" subtitle={`${highPriority.length} recommendations`}>
              {highPriority.map((rec, index) => (
                <List.Item
                  key={`high-${index}`}
                  title={rec.title}
                  subtitle={rec.description.slice(0, 60) + "..."}
                  icon={getTypeIcon(rec.type)}
                  accessories={[
                    { tag: { value: rec.type, color: getTypeIcon(rec.type).tintColor } },
                    { tag: { value: "high", color: getPriorityColor(rec.priority) } },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action title="View Details" icon={Icon.Eye} onAction={() => viewRecommendation(rec)} />
                      {rec.researchQuery && (
                        <Action.CopyToClipboard
                          title="Copy Research Query"
                          content={rec.researchQuery}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {mediumPriority.length > 0 && (
            <List.Section title="Medium Priority" subtitle={`${mediumPriority.length} recommendations`}>
              {mediumPriority.map((rec, index) => (
                <List.Item
                  key={`medium-${index}`}
                  title={rec.title}
                  subtitle={rec.description.slice(0, 60) + "..."}
                  icon={getTypeIcon(rec.type)}
                  accessories={[
                    { tag: { value: rec.type, color: getTypeIcon(rec.type).tintColor } },
                    { tag: { value: "medium", color: getPriorityColor(rec.priority) } },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action title="View Details" icon={Icon.Eye} onAction={() => viewRecommendation(rec)} />
                      {rec.researchQuery && (
                        <Action.CopyToClipboard
                          title="Copy Research Query"
                          content={rec.researchQuery}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {lowPriority.length > 0 && (
            <List.Section title="Low Priority" subtitle={`${lowPriority.length} recommendations`}>
              {lowPriority.map((rec, index) => (
                <List.Item
                  key={`low-${index}`}
                  title={rec.title}
                  subtitle={rec.description.slice(0, 60) + "..."}
                  icon={getTypeIcon(rec.type)}
                  accessories={[{ tag: { value: rec.type, color: getTypeIcon(rec.type).tintColor } }]}
                  actions={
                    <ActionPanel>
                      <Action title="View Details" icon={Icon.Eye} onAction={() => viewRecommendation(rec)} />
                      {rec.researchQuery && (
                        <Action.CopyToClipboard
                          title="Copy Research Query"
                          content={rec.researchQuery}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function FocusedAnalysisForm() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { focusArea: string }) {
    if (!values.focusArea.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No focus area",
        message: "Enter a topic to focus on",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Analyzing...",
      message: values.focusArea,
    });

    try {
      const analysis = await analyzeSpecificArea(values.focusArea);
      toast.style = Toast.Style.Success;
      toast.title = "Analysis Complete";
      push(<FocusedAnalysisResults analysis={analysis} focusArea={values.focusArea} />);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Analysis Failed";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Analyze" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="focusArea"
        title="Focus Area"
        placeholder="e.g., Roman military logistics, grain supply, legion organization"
        info="What specific topic do you want recommendations for?"
      />
    </Form>
  );
}

interface FocusedAnalysisResultsProps {
  analysis: VaultAnalysis;
  focusArea: string;
}

function FocusedAnalysisResults({ analysis, focusArea }: FocusedAnalysisResultsProps) {
  const { push } = useNavigation();

  function getTypeIcon(type: Recommendation["type"]): { source: Icon; tintColor: Color } {
    switch (type) {
      case "gap":
        return { source: Icon.PlusCircle, tintColor: Color.Red };
      case "shallow":
        return { source: Icon.Layers, tintColor: Color.Orange };
      case "connection":
        return { source: Icon.Link, tintColor: Color.Blue };
      case "question":
        return { source: Icon.QuestionMark, tintColor: Color.Purple };
      case "source":
        return { source: Icon.Book, tintColor: Color.Green };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  }

  function getPriorityColor(priority: Recommendation["priority"]): Color {
    switch (priority) {
      case "high":
        return Color.Red;
      case "medium":
        return Color.Orange;
      case "low":
        return Color.SecondaryText;
    }
  }

  return (
    <List navigationTitle={`Recommendations: ${focusArea}`}>
      <List.Section title="Summary">
        <List.Item title={analysis.summary} icon={Icon.Info} />
      </List.Section>

      <List.Section title="Recommendations" subtitle={`${analysis.recommendations.length} items`}>
        {analysis.recommendations.map((rec, index) => (
          <List.Item
            key={index}
            title={rec.title}
            subtitle={rec.description.slice(0, 60) + "..."}
            icon={getTypeIcon(rec.type)}
            accessories={[
              { tag: { value: rec.type, color: getTypeIcon(rec.type).tintColor } },
              { tag: { value: rec.priority, color: getPriorityColor(rec.priority) } },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  onAction={() => push(<RecommendationDetail recommendation={rec} />)}
                />
                {rec.researchQuery && (
                  <Action.CopyToClipboard
                    title="Copy Research Query"
                    content={rec.researchQuery}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

interface RecommendationDetailProps {
  recommendation: Recommendation;
}

function RecommendationDetail({ recommendation }: RecommendationDetailProps) {
  const rec = recommendation;

  let markdown = `# ${rec.title}\n\n`;
  markdown += `**Type:** ${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}\n`;
  markdown += `**Priority:** ${rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}\n\n`;
  markdown += `---\n\n`;
  markdown += `## Why This Matters\n\n${rec.description}\n\n`;

  if (rec.relatedNotes.length > 0) {
    markdown += `## Related Notes\n\n`;
    for (const note of rec.relatedNotes) {
      markdown += `- \`${note}\`\n`;
    }
    markdown += "\n";
  }

  if (rec.suggestedSources && rec.suggestedSources.length > 0) {
    markdown += `## Suggested Sources\n\n`;
    for (const source of rec.suggestedSources) {
      markdown += `- ${source}\n`;
    }
    markdown += "\n";
  }

  if (rec.researchQuery) {
    markdown += `## Research Query\n\n`;
    markdown += `Use this query to find sources:\n\n`;
    markdown += `> ${rec.researchQuery}\n`;
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {rec.researchQuery && (
            <Action.CopyToClipboard
              title="Copy Research Query"
              content={rec.researchQuery}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
