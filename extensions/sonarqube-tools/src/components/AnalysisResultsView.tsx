import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useState } from "react";
import { suggestCodeFixes } from "../lib/aiService";
import { SonarQubeResults, SonarQubeIssue } from "../utils/sonarQubeResults";

type Props = {
  results: SonarQubeResults;
  interpretation: string;
  projectName: string;
};

/**
 * Component to display SonarQube analysis results with AI interpretation
 */
export default function AnalysisResultsView({ results, interpretation, projectName }: Props) {
  const [selectedIssue, setSelectedIssue] = useState<SonarQubeIssue | null>(null);
  const [suggestedFix, setSuggestedFix] = useState<string | null>(null);
  const [isLoadingFix, setIsLoadingFix] = useState(false);

  /**
   * Fetches AI-generated fix suggestion for a specific issue
   */
  const handleGetFixSuggestion = async (issue: SonarQubeIssue) => {
    setIsLoadingFix(true);
    try {
      const fix = await suggestCodeFixes(issue);
      setSuggestedFix(fix);
      setSelectedIssue(issue);
    } catch (error) {
      console.error("Error getting fix suggestion:", error);
    } finally {
      setIsLoadingFix(false);
    }
  };

  // Function removed: formatResults was previously used with the Detail component
  // Now using List.Item.Detail components instead

  /**
   * Format SonarQube rating (1-5) as text description
   */
  const formatRating = (rating: string): string => {
    switch (rating) {
      case "1.0":
        return "A (Good)";
      case "2.0":
        return "B (Fair)";
      case "3.0":
        return "C (Moderate)";
      case "4.0":
        return "D (Poor)";
      case "5.0":
        return "E (Very Poor)";
      default:
        return rating;
    }
  };

  return (
    <List isLoading={isLoadingFix} searchBarPlaceholder="Search issues...">
      {/* AI Analysis Summary Section */}
      <List.Section title="AI Analysis Summary">
        <List.Item
          title="Analysis Summary"
          detail={<List.Item.Detail markdown={interpretation} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy AI Analysis" content={interpretation} />
              <Action.OpenInBrowser
                title="Open in Sonarqube"
                url={`http://localhost:9000/dashboard?id=${projectName}`}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Key Metrics Section */}
      <List.Section title="Key Metrics">
        {results.metrics &&
          [
            { key: "bugs", label: "Bugs" },
            { key: "vulnerabilities", label: "Vulnerabilities" },
            { key: "code_smells", label: "Code Smells" },
            { key: "coverage", label: "Coverage", suffix: "%" },
            { key: "duplicated_lines_density", label: "Duplicated Lines", suffix: "%" },
            { key: "reliability_rating", label: "Reliability Rating", format: formatRating },
            { key: "security_rating", label: "Security Rating", format: formatRating },
            { key: "sqale_rating", label: "Maintainability Rating", format: formatRating },
          ].map((metric) => {
            const value = results.metrics.find((m) => m.metric === metric.key);
            const displayValue = metric.format
              ? metric.format(value?.value?.toString() || "N/A")
              : `${value?.value || "N/A"}${metric.suffix || ""}`;

            return (
              <List.Item
                key={metric.key}
                title={metric.label}
                accessoryTitle={displayValue}
                icon={
                  metric.key.includes("rating")
                    ? displayValue.includes("A")
                      ? Icon.CircleProgress100
                      : displayValue.includes("B")
                        ? Icon.CircleProgress75
                        : displayValue.includes("C")
                          ? Icon.CircleProgress50
                          : displayValue.includes("D")
                            ? Icon.CircleProgress25
                            : Icon.ExclamationMark
                    : undefined
                }
              />
            );
          })}
      </List.Section>

      {/* Issues Section */}
      <List.Section title="Issues">
        {results.issues && results.issues.length > 0 ? (
          results.issues.slice(0, 10).map((issue, index) => (
            <List.Item
              key={index}
              title={`${issue.severity}: ${issue.message}`}
              subtitle={`${issue.component.split(":").pop()} (Line ${issue.line || "N/A"})`}
              icon={
                issue.severity === "CRITICAL"
                  ? Icon.ExclamationMark
                  : issue.severity === "BLOCKER"
                    ? Icon.Stop
                    : issue.severity === "MAJOR"
                      ? Icon.Warning
                      : Icon.Information
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Get Fix Suggestion"
                    icon={isLoadingFix ? Icon.Clock : Icon.Code}
                    onAction={() => handleGetFixSuggestion(issue)}
                  />
                </ActionPanel>
              }
              detail={
                selectedIssue === issue && suggestedFix ? (
                  <List.Item.Detail
                    markdown={`## AI Fix Suggestion

For issue: "${issue.message}"

\`\`\`
${suggestedFix}
\`\`\`
`}
                  />
                ) : undefined
              }
            />
          ))
        ) : (
          <List.Item title="No issues found" subtitle="Great job!" icon={Icon.Checkmark} />
        )}
      </List.Section>
    </List>
  );
}
