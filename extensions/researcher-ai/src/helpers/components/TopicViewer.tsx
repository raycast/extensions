import { Detail, ActionPanel, Action, Icon, Color, showHUD, showToast, Toast, Clipboard, AI } from "@raycast/api";
import { useState } from "react";
import { ResearchProject, ParsedTopic, RESEARCH_STEPS } from "../../types";
import { RESEARCH_PROMPT } from "../prompts";

interface TopicViewerProps {
  topic: ParsedTopic;
  project: ResearchProject;
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
}

export function TopicViewer({ topic, project, onSave, projects }: TopicViewerProps) {
  const [isResearching, setIsResearching] = useState(false);

  const researchTopic = async () => {
    setIsResearching(true);
    await showHUD("Researching topic...");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Researching topic...",
    });

    try {
      const prompt = `${RESEARCH_PROMPT}\n\nTopic: ${topic.name}\n\nContext: ${topic.content}`;
      const response = await AI.ask(prompt);

      const updatedProjects = projects.map((p) => {
        if (p.id === project.id) {
          const updatedTopics = p.parsedTopics?.map((t) => {
            if (t.name === topic.name) {
              return {
                ...t,
                researchContent: response,
              };
            }
            return t;
          });
          return {
            ...p,
            parsedTopics: updatedTopics,
          };
        }
        return p;
      });

      await onSave(updatedProjects);
      toast.style = Toast.Style.Success;
      toast.title = "Research completed!";
      await showHUD("✨ Research findings ready!");
    } catch (error) {
      console.error("Error researching topic:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to research topic";
      toast.message = "Please try again";
      await showHUD("❌ Failed to research topic");
    } finally {
      setIsResearching(false);
    }
  };

  const copyResearch = async () => {
    if (topic.researchContent) {
      await Clipboard.copy(topic.researchContent);
      await showHUD("📋 Research copied to clipboard!");
    }
  };

  const markdown = `# ${topic.name}
${topic.content}
---
# Research Findings
${topic.researchContent || "_No research conducted yet. Use the action menu to start research._"}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={topic.name}
      isLoading={isResearching}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Topic Type"
            text={topic.isPrimary ? "Primary Topic" : "Secondary Topic"}
            icon={topic.isPrimary ? Icon.Star : Icon.Document}
          />
          <Detail.Metadata.TagList title="Research Status">
            <Detail.Metadata.TagList.Item
              text={topic.researchContent ? "Research Complete" : "Not Researched"}
              color={topic.researchContent ? Color.Green : Color.Yellow}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={topic.researchContent ? "Update Research" : "Start Research"}
            icon={Icon.MagnifyingGlass}
            onAction={researchTopic}
          />
          {topic.researchContent && (
            <>
              <Action
                title="Copy Results as Markdown"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={copyResearch}
              />
              <Action
                title="Mark Done"
                icon={Icon.CheckCircle}
                onAction={() => {
                  const updatedProjects = projects.map((p) => {
                    if (p.id === project.id) {
                      return {
                        ...p,
                        currentStep: Math.min(p.currentStep + 1, RESEARCH_STEPS.length - 1),
                      };
                    }
                    return p;
                  });
                  onSave(updatedProjects);
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
