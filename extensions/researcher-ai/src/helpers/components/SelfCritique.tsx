import { Detail, ActionPanel, Action, Icon, Color, showHUD, showToast, Toast, Clipboard, AI } from "@raycast/api";
import { useState } from "react";
import { ResearchProject, RESEARCH_STEPS } from "../../types";
import { SELF_CRITIQUE_PROMPT } from "../prompts";

interface SelfCritiqueProps {
  project: ResearchProject;
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
}

export function SelfCritique({ project, onSave, projects }: SelfCritiqueProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCritique, setCurrentCritique] = useState(project.critiqueContent || "");

  const generateCritique = async () => {
    if (!project.reportContent) {
      await showHUD("❌ No report to critique yet!");
      return;
    }

    setIsGenerating(true);
    await showHUD("🔍 Starting self-critique...");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Analyzing report...",
    });

    try {
      const prompt = `${SELF_CRITIQUE_PROMPT}

Report to Review:

${project.reportContent}`;

      const response = await AI.ask(prompt);

      const updatedProjects = projects.map((p) => {
        if (p.id === project.id) {
          return {
            ...p,
            critiqueContent: response,
            currentStep: 4, // Move to final report step
            status: "in_progress" as const,
          };
        }
        return p;
      });

      await onSave(updatedProjects);
      setCurrentCritique(response);

      toast.style = Toast.Style.Success;
      toast.title = "Self-critique completed!";
      await showHUD("✨ Critique ready!");
    } catch (error) {
      console.error("Error generating critique:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate critique";
      toast.message = "Please try again";
      await showHUD("❌ Failed to generate critique");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCritique = async () => {
    if (currentCritique) {
      await Clipboard.copy(currentCritique);
      await showHUD("📋 Critique copied to clipboard!");
    }
  };

  const canGenerateCritique = !!project.reportContent;

  return (
    <Detail
      markdown={currentCritique || "No critique generated yet. Use the action menu to analyze the report."}
      navigationTitle="Self-Critique"
      isLoading={isGenerating}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Step" text="Self-Critique" icon={Icon.Stars} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={currentCritique ? "Critique Generated" : "Not Generated"}
              color={currentCritique ? Color.Green : Color.Yellow}
            />
          </Detail.Metadata.TagList>
          {!canGenerateCritique && (
            <Detail.Metadata.TagList title="Warning">
              <Detail.Metadata.TagList.Item text="Generate report first" color={Color.Red} />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={currentCritique ? "Regenerate Critique" : "Generate Critique"}
            icon={Icon.Stars}
            onAction={generateCritique}
          />
          {currentCritique && (
            <>
              <Action
                title="Copy Critique as Markdown"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={copyCritique}
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
                  await showHUD("✨ Self-critique complete!");
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
