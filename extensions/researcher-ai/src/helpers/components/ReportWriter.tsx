import { Detail, ActionPanel, Action, Icon, Color, showHUD, showToast, Toast, Clipboard, AI } from "@raycast/api";
import { useState } from "react";
import { ResearchProject, RESEARCH_STEPS } from "../../types";
import { REPORT_GENERATION_PROMPT } from "../prompts";

interface ReportWriterProps {
  project: ResearchProject;
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
}

export function ReportWriter({ project, onSave, projects }: ReportWriterProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState(project.reportContent || "");

  const generateReport = async () => {
    setIsGenerating(true);
    await showHUD("📝 Starting report generation...");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating research report...",
    });

    try {
      // Gather all research findings
      const primaryTopic = project.parsedTopics?.find((t) => t.isPrimary);
      const researchFindings = project.parsedTopics
        ?.map((topic) => `# ${topic.name}\n${topic.researchContent || "No research conducted."}`)
        .join("\n\n---\n\n");

      const prompt = `${REPORT_GENERATION_PROMPT}

Research Context: ${project.researchPrompt}
Primary Topic: ${primaryTopic?.name || "Not specified"}
Research Findings:

${researchFindings}`;

      const response = await AI.ask(prompt);

      const updatedProjects = projects.map((p) => {
        if (p.id === project.id) {
          return {
            ...p,
            reportContent: response,
            currentStep: 3, // Move to self-critique step
            status: "in_progress" as const,
          };
        }
        return p;
      });

      await onSave(updatedProjects);
      setCurrentReport(response);

      toast.style = Toast.Style.Success;
      toast.title = "Report generated successfully!";
      await showHUD("✨ Research report ready!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate report";
      toast.message = "Please try again";
      await showHUD("❌ Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReport = async () => {
    if (currentReport) {
      await Clipboard.copy(currentReport);
      await showHUD("📋 Report copied to clipboard!");
    }
  };

  const canGenerateReport = project.parsedTopics?.every((topic) => topic.researchContent);

  return (
    <Detail
      markdown={currentReport || "No report generated yet. Use the action menu to generate the report."}
      navigationTitle="Research Report"
      isLoading={isGenerating}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Step" text="Report Writing" icon={Icon.Document} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={currentReport ? "Report Generated" : "Not Generated"}
              color={currentReport ? Color.Green : Color.Yellow}
            />
          </Detail.Metadata.TagList>
          {!canGenerateReport && (
            <Detail.Metadata.TagList title="Warning">
              <Detail.Metadata.TagList.Item text="Complete all research first" color={Color.Red} />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={currentReport ? "Regenerate Report" : "Generate Report"}
            icon={Icon.Document}
            onAction={canGenerateReport ? generateReport : () => {}}
          />
          {currentReport && (
            <>
              <Action
                title="Copy Report as Markdown"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={copyReport}
              />
              <Action
                title="Mark Done"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  const updatedProjects = projects.map((p) => {
                    if (p.id === project.id) {
                      return {
                        ...p,
                        currentStep: Math.min(p.currentStep + 1, RESEARCH_STEPS.length - 1),
                      };
                    }
                    return p;
                  });
                  await onSave(updatedProjects);
                  await showHUD("✨ Report writing complete!");
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
