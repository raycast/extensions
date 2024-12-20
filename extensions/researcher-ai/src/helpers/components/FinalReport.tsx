import { Detail, ActionPanel, Action, Icon, Color, showHUD, showToast, Toast, Clipboard, AI } from "@raycast/api";
import { useState } from "react";
import { ResearchProject } from "../../types";
import { FINAL_REPORT_PROMPT } from "../prompts";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

interface FinalReportProps {
  project: ResearchProject;
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
}

export function FinalReport({ project, onSave, projects }: FinalReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [finalReport, setFinalReport] = useState(project.finalReport || "");

  const generateFinalReport = async () => {
    if (!project.reportContent || !project.critiqueContent) {
      await showHUD("❌ Need both report and critique first!");
      return;
    }

    setIsGenerating(true);
    await showHUD("📝 Generating final report...");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating final report...",
    });

    try {
      const prompt = `${FINAL_REPORT_PROMPT}

Original Report:
${project.reportContent}

Critique Feedback:
${project.critiqueContent}`;

      const response = await AI.ask(prompt);

      const updatedProjects = projects.map((p) => {
        if (p.id === project.id) {
          return {
            ...p,
            finalReport: response,
            currentStep: 4,
            status: "completed" as const,
          };
        }
        return p;
      });

      await onSave(updatedProjects);
      setFinalReport(response);

      toast.style = Toast.Style.Success;
      toast.title = "Final report completed!";
      await showHUD("✨ Final report ready!");
    } catch (error) {
      console.error("Error generating final report:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate final report";
      toast.message = "Please try again";
      await showHUD("❌ Failed to generate final report");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReport = async () => {
    if (finalReport) {
      await Clipboard.copy(finalReport);
      await showHUD("📋 Final report copied to clipboard!");
    }
  };

  const exportToMarkdown = async () => {
    if (!finalReport) {
      await showHUD("❌ Generate a report first!");
      return;
    }

    try {
      const downloadsPath = join(homedir(), "Downloads");
      const filename = `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}_final_report.md`;
      const filepath = join(downloadsPath, filename);

      await writeFile(filepath, finalReport, "utf8");
      await showHUD(`✨ Report exported to Downloads folder as "${filename}"`);

      // Show a toast with more details
      await showToast({
        style: Toast.Style.Success,
        title: "Report Exported Successfully",
        message: `Saved to: ${filepath}`,
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      await showHUD("❌ Failed to export report");
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: "Could not save the report file",
      });
    }
  };

  const canGenerateFinal = !!(project.reportContent && project.critiqueContent);

  return (
    <Detail
      markdown={
        finalReport ||
        "No final report generated yet. Use the action menu to generate the improved report based on critique feedback."
      }
      navigationTitle="Final Report"
      isLoading={isGenerating}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Step" text="Final Report" icon={Icon.CheckCircle} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={finalReport ? "Report Complete" : "Not Generated"}
              color={finalReport ? Color.Green : Color.Yellow}
            />
          </Detail.Metadata.TagList>
          {!canGenerateFinal && (
            <Detail.Metadata.TagList title="Warning">
              <Detail.Metadata.TagList.Item text="Complete previous steps first" color={Color.Red} />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={finalReport ? "Regenerate Final Report" : "Generate Final Report"}
            icon={Icon.Document}
            onAction={generateFinalReport}
          />
          {finalReport && (
            <>
              <Action
                title="Copy Report as Markdown"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={copyReport}
              />
              <Action
                title="Export to Downloads Folder"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                onAction={exportToMarkdown}
              />
              <Action
                title="Mark Project Complete"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  const updatedProjects = projects.map((p) => {
                    if (p.id === project.id) {
                      return {
                        ...p,
                        status: "completed" as const,
                      };
                    }
                    return p;
                  });
                  await onSave(updatedProjects);
                  await showHUD("🎉 Research project completed!");
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
