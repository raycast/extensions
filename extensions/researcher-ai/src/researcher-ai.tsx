import {
  ActionPanel,
  List,
  Action,
  Icon,
  Color,
  Form,
  useNavigation,
  LocalStorage,
  AI,
  Detail,
  showHUD,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { ResearchProject, RESEARCH_STEPS, ParsedTopic } from "./types";
import { ReportWriter } from "./helpers/components/ReportWriter";
import { SelfCritique } from "./helpers/components/SelfCritique";
import { FinalReport } from "./helpers/components/FinalReport";
import {
  TOPIC_GENERATION_PROMPT,
  RESEARCH_PROMPT,
  REPORT_GENERATION_PROMPT,
  SELF_CRITIQUE_PROMPT,
  FINAL_REPORT_PROMPT,
} from "./helpers/prompts";

const STORAGE_KEY = "research_projects";

export default function Command() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const storedProjects = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (storedProjects) {
      setProjects(JSON.parse(storedProjects));
    }
  };

  const saveProjects = async (updatedProjects: ResearchProject[]) => {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  const deleteProject = async (projectId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    await saveProjects(updatedProjects);
  };

  return (
    <List
      actions={
        <ActionPanel>
          <Action
            title="New Research Project"
            icon={Icon.Plus}
            onAction={() => push(<CreateProjectForm onSave={saveProjects} projects={projects} />)}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Warning">
        <List.Item title="Experimental Product. Quit and reopen if issues occur." accessories={[{ text: "⚠️" }]} />
      </List.Section>

      <List.Section title="Projects">
        <List.EmptyView
          icon={Icon.Document}
          title="No Research Projects"
          description="Create a new research project to get started"
          actions={
            <ActionPanel>
              <Action
                title="Create New Project"
                icon={Icon.Plus}
                onAction={() => push(<CreateProjectForm onSave={saveProjects} projects={projects} />)}
              />
            </ActionPanel>
          }
        />

        {projects.map((project) => (
          <List.Item
            key={project.id}
            icon={{ source: Icon.Document, tintColor: getStatusColor(project.status) }}
            title={project.title}
            subtitle={`Step ${project.currentStep + 1}: ${RESEARCH_STEPS[project.currentStep].title}`}
            accessories={[
              { icon: Icon[RESEARCH_STEPS[project.currentStep].icon as keyof typeof Icon] },
              { text: capitalizeStatus(project.status) },
              { text: project.model },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Project Details"
                  target={<ProjectDetail project={project} onSave={saveProjects} projects={projects} />}
                  icon={Icon.Sidebar}
                />
                <Action
                  title="Create New Project"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => push(<CreateProjectForm onSave={saveProjects} projects={projects} />)}
                />
                <Action
                  title="Delete Project"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteProject(project.id)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ProjectForm({
  onSave,
  projects,
  initialProject,
}: {
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
  initialProject?: ResearchProject;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { title: string; model: string; researchPrompt: string }) {
    if (initialProject) {
      // Edit mode
      const updatedProjects = projects.map((p) =>
        p.id === initialProject.id
          ? {
              ...p,
              title: values.title,
              model: values.model,
              researchPrompt: values.researchPrompt,
            }
          : p,
      );
      await onSave(updatedProjects);
    } else {
      // Create mode
      const newProject = {
        id: Date.now().toString(),
        title: values.title,
        model: values.model,
        researchPrompt: values.researchPrompt,
        status: "not_started" as const,
        currentStep: 0,
      } satisfies ResearchProject;
      await onSave([...projects, newProject]);
    }
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initialProject ? "Update Project" : "Create Project"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Project Title"
        placeholder="Enter project title"
        defaultValue={initialProject?.title}
        autoFocus
      />
      <Form.TextArea
        id="researchPrompt"
        title="Research Prompt"
        placeholder="Describe what you want to research..."
        defaultValue={initialProject?.researchPrompt}
      />
      <Form.Dropdown id="model" title="Model Selection" defaultValue={initialProject?.model}>
        <Form.Dropdown.Item value="OpenAI_GPT4o-mini" title="OpenAI/GPT4o-Mini" />
        <Form.Dropdown.Item value="Anthropic_Claude_Sonnet" title="Anthropic/Claude-3.5-Sonnet" />
        <Form.Dropdown.Item value="Anthropic_Claude_Haiku" title="Anthropic/Claude-3.5-Haiku" />
        <Form.Dropdown.Item value="Anthropic_Claude_Opus" title="Anthropic/Claude-3-Opus" />
        <Form.Dropdown.Item value="OpenAI_GPT4o" title="OpenAI/GPT4o" />
      </Form.Dropdown>
    </Form>
  );
}

function CreateProjectForm({
  onSave,
  projects,
}: {
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
}) {
  return <ProjectForm onSave={onSave} projects={projects} />;
}

function TopicDetail({
  project,
  onSave,
  projects,
}: {
  project: ResearchProject;
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState(project.topicMarkdown || "");
  const [currentTopics, setCurrentTopics] = useState(project.topicMarkdown || "");

  const updateProjectStep = async (stepIndex: number) => {
    const updatedProjects = projects.map((p) => {
      if (p.id === project.id) {
        const status: ResearchProject["status"] = stepIndex === RESEARCH_STEPS.length - 1 ? "completed" : "in_progress";
        return {
          ...p,
          currentStep: stepIndex,
          status,
        };
      }
      return p;
    });
    await onSave(updatedProjects);
    await showHUD("✨ Marked as complete!");
  };

  const generateTopics = async () => {
    setIsGenerating(true);
    await showHUD("Generating topics...");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating research topics...",
    });

    try {
      const prompt = `${TOPIC_GENERATION_PROMPT}\n\nResearch Prompt: ${project.researchPrompt}`;
      const response = await AI.ask(prompt);

      // Parse topics
      const parsedTopics: ParsedTopic[] = [];
      const topicMatches = response.match(/<topic[^>]*>[\s\S]*?<\/topic>/g) || [];

      // Create display version
      let displayMarkdown = "# Research Topics\n\n";

      topicMatches.forEach((topicStr, index) => {
        const nameMatch = topicStr.match(/<name>(.*?)<\/name>/);
        const isPrimary = topicStr.includes('primary="true"') || index === 0;
        if (nameMatch) {
          const name = nameMatch[1];
          const content = topicStr
            .replace(/<topic[^>]*>/, "")
            .replace(/<\/topic>/, "")
            .replace(/<name>.*?<\/name>/, "")
            .trim();
          parsedTopics.push({ name, content, isPrimary });

          // Add to display markdown
          displayMarkdown += `## ${isPrimary ? "🌟 " : ""}${name}\n\n`;
          displayMarkdown += `${content}\n\n`;
          if (index < topicMatches.length - 1) {
            displayMarkdown += "---\n\n";
          }
        }
      });

      const updatedProjects = projects.map((p) => {
        if (p.id === project.id) {
          return {
            ...p,
            topicMarkdown: response,
            topicDisplay: displayMarkdown,
            parsedTopics,
            currentStep: 1,
            status: "in_progress" as const,
          };
        }
        return p;
      });
      await onSave(updatedProjects);
      setCurrentTopics(displayMarkdown);

      toast.style = Toast.Style.Success;
      toast.title = "Topics generated successfully!";
      await showHUD("✨ Research topics ready!");
    } catch (error) {
      console.error("Error generating topics:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate topics";
      toast.message = "Please try again";
      await showHUD("❌ Failed to generate topics");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyResults = async () => {
    const content = project.topicDisplay || currentTopics;
    if (content) {
      await Clipboard.copy(content);
      await showHUD("📋 Topics copied to clipboard!");
    }
  };

  const saveEditedTopics = async () => {
    const updatedProjects = projects.map((p) => {
      if (p.id === project.id) {
        return {
          ...p,
          topicDisplay: editableContent,
        };
      }
      return p;
    });
    await onSave(updatedProjects);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Save Changes" onSubmit={() => saveEditedTopics()} />
            <Action title="Cancel" onAction={() => setIsEditing(false)} />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="topicContent"
          title="Edit Topics"
          value={editableContent}
          onChange={setEditableContent}
          enableMarkdown
        />
      </Form>
    );
  }

  const markdown = `# Step 1. Generate Research Topics
💡 Research Topic Generation

${project.topicDisplay || currentTopics || "No topics generated yet. Use the action menu to generate topics."}

${currentTopics ? "_Not satisfied with the results? Use the action menu to regenerate topics._" : ""}`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isGenerating}
      navigationTitle="Research Topics"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Step" text="Topic Generation" icon={Icon.LightBulb} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={project.status === "not_started" ? "Not Started" : "In Progress"}
              color={project.status === "not_started" ? Color.Red : Color.Yellow}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={currentTopics ? "Regenerate Topics" : "Generate Topics"}
            icon={Icon.Repeat}
            onAction={generateTopics}
          />
          {currentTopics && (
            <>
              <Action
                title="Copy Results as Markdown"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={copyResults}
              />
              <Action title="Edit Topics" icon={Icon.Pencil} onAction={() => setIsEditing(true)} />
              <Action title="Mark Done" icon={Icon.CheckCircle} onAction={() => updateProjectStep(1)} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

function TopicViewer({
  topic,
  project,
  onSave,
  projects,
}: {
  topic: ParsedTopic;
  project: ResearchProject;
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
}) {
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

      // Update the topic's research content
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

function GatherInformation({
  project,
  onSave,
  projects,
}: {
  project: ResearchProject;
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
}) {
  const topics = project.parsedTopics || [];
  const primaryTopic = topics.find((t) => t.isPrimary);
  const [isResearchingAll, setIsResearchingAll] = useState(false);

  const areAllTopicsResearched = () => {
    return topics.every((topic) => topic.researchContent);
  };

  const markStepComplete = async () => {
    const updatedProjects = projects.map((p) => {
      if (p.id === project.id) {
        return {
          ...p,
          currentStep: 2,
          status: "in_progress" as const,
        };
      }
      return p;
    });
    await onSave(updatedProjects);
    await showHUD("✨ Information gathering complete!");
  };

  const researchAllTopics = async () => {
    setIsResearchingAll(true);
    await showHUD("🔍 Starting research on all topics...");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Researching all topics...",
    });

    try {
      const updatedTopics = [...(project.parsedTopics || [])];
      let completedCount = 0;
      const totalTopics = updatedTopics.length;

      for (const topic of updatedTopics) {
        const prompt = `${RESEARCH_PROMPT}\n\nTopic: ${topic.name}\n\nContext: ${topic.content}`;
        const response = await AI.ask(prompt);
        topic.researchContent = response;

        completedCount++;
        await showHUD(`✨ Researched ${completedCount}/${totalTopics}: ${topic.name}`);
        toast.message = `Researching: ${topic.name} (${completedCount}/${totalTopics})`;
      }

      const updatedProjects = projects.map((p) => {
        if (p.id === project.id) {
          return {
            ...p,
            parsedTopics: updatedTopics,
          };
        }
        return p;
      });

      await onSave(updatedProjects);
      toast.style = Toast.Style.Success;
      toast.title = "All topics researched!";
      await showHUD("🎉 Research complete for all topics!");
    } catch (error) {
      console.error("Error researching topics:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to research all topics";
      toast.message = "Please try again";
      await showHUD("❌ Failed to research all topics");
    } finally {
      setIsResearchingAll(false);
    }
  };

  return (
    <List navigationTitle="Research Topics" searchBarPlaceholder="Search topics..." isLoading={isResearchingAll}>
      <List.Section title="Primary Topic">
        {primaryTopic && (
          <List.Item
            title={primaryTopic.name}
            subtitle="Primary Research Focus"
            accessories={[
              { text: "⭐ Primary Topic" },
              { text: primaryTopic.researchContent ? "Researched" : "Not Researched" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Research Current Topic"
                  target={<TopicViewer topic={primaryTopic} project={project} onSave={onSave} projects={projects} />}
                  icon={Icon.MagnifyingGlass}
                />
                <Action
                  title="Research All Topics"
                  icon={Icon.List}
                  onAction={researchAllTopics}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                {areAllTopicsResearched() && (
                  <Action
                    title="Mark Step as Complete"
                    icon={Icon.CheckCircle}
                    onAction={markStepComplete}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                )}
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`# ${primaryTopic.name}\n${primaryTopic.content}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={primaryTopic.researchContent ? "Research Complete" : "Not Researched"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Total Topics" text={topics.length.toString()} />
                    <List.Item.Detail.Metadata.Label
                      title="Research Progress"
                      text={`${topics.filter((t) => t.researchContent).length}/${topics.length} Complete`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        )}
      </List.Section>

      <List.Section title="Secondary Topics">
        {topics
          .filter((topic) => !topic.isPrimary)
          .map((topic, index) => (
            <List.Item
              key={index}
              title={topic.name}
              accessories={[
                { text: "📄 Secondary Topic" },
                { text: topic.researchContent ? "Researched" : "Not Researched" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Research Current Topic"
                    target={<TopicViewer topic={topic} project={project} onSave={onSave} projects={projects} />}
                    icon={Icon.MagnifyingGlass}
                  />
                  <Action
                    title="Research All Topics"
                    icon={Icon.List}
                    onAction={researchAllTopics}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  {areAllTopicsResearched() && (
                    <Action
                      title="Mark Step as Complete"
                      icon={Icon.CheckCircle}
                      onAction={markStepComplete}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                  )}
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={`# ${topic.name}\n${topic.content}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text={topic.researchContent ? "Research Complete" : "Not Researched"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

function ProjectDetail({
  project,
  onSave,
  projects,
}: {
  project: ResearchProject;
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
}) {
  const updateProjectStep = async (stepIndex: number) => {
    const updatedProjects = projects.map((p) => {
      if (p.id === project.id) {
        return {
          ...p,
          currentStep: stepIndex,
          status: (stepIndex === RESEARCH_STEPS.length - 1 ? "completed" : "in_progress") as const,
        };
      }
      return p;
    });
    await onSave(updatedProjects);
  };

  const runAllSteps = async () => {
    await showHUD("🚀 Starting automated research process...");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running all research steps...",
    });

    try {
      // Step 1: Generate Topics
      toast.message = "Step 1: Generating Topics";
      const topicPrompt = `${TOPIC_GENERATION_PROMPT}\n\nResearch Prompt: ${project.researchPrompt}`;
      const topicsResponse = await AI.ask(topicPrompt);

      // Parse topics
      const parsedTopics: ParsedTopic[] = [];
      const topicMatches = topicsResponse.match(/<topic[^>]*>[\s\S]*?<\/topic>/g) || [];
      let displayMarkdown = "# Research Topics\n\n";

      topicMatches.forEach((topicStr, index) => {
        const nameMatch = topicStr.match(/<name>(.*?)<\/name>/);
        const isPrimary = topicStr.includes('primary="true"') || index === 0;
        if (nameMatch) {
          const name = nameMatch[1];
          const content = topicStr
            .replace(/<topic[^>]*>/, "")
            .replace(/<\/topic>/, "")
            .replace(/<name>.*?<\/name>/, "")
            .trim();
          parsedTopics.push({ name, content, isPrimary });

          displayMarkdown += `## ${isPrimary ? "🌟 " : ""}${name}\n\n`;
          displayMarkdown += `${content}\n\n`;
          if (index < topicMatches.length - 1) {
            displayMarkdown += "---\n\n";
          }
        }
      });

      let updatedProject = {
        ...project,
        topicMarkdown: topicsResponse,
        topicDisplay: displayMarkdown,
        parsedTopics,
        currentStep: 1,
        status: "in_progress" as const,
      };

      await showHUD("✨ Topics generated!");

      // Step 2: Research All Topics
      toast.message = "Step 2: Researching Topics";
      for (let i = 0; i < parsedTopics.length; i++) {
        const topic = parsedTopics[i];
        await showHUD(`🔍 Researching topic ${i + 1}/${parsedTopics.length}: ${topic.name}`);

        const researchPrompt = `${RESEARCH_PROMPT}\n\nTopic: ${topic.name}\n\nContext: ${topic.content}`;
        const researchResponse = await AI.ask(researchPrompt);
        topic.researchContent = researchResponse;
      }

      updatedProject = {
        ...updatedProject,
        parsedTopics,
        currentStep: 2,
      };

      await showHUD("✨ All topics researched!");

      // Step 3: Generate Report
      toast.message = "Step 3: Writing Report";
      const reportPrompt = `${REPORT_GENERATION_PROMPT}\n\nResearch Context: ${project.researchPrompt}\n\nPrimary Topic: ${parsedTopics.find((t) => t.isPrimary)?.name}\n\nResearch Findings: ${parsedTopics.map((t) => `\n\n# ${t.name}\n${t.researchContent}`).join("\n")}`;
      const reportResponse = await AI.ask(reportPrompt);

      updatedProject = {
        ...updatedProject,
        reportContent: reportResponse,
        currentStep: 3,
      };

      await showHUD("✨ Report generated!");

      // Step 4: Self Critique
      toast.message = "Step 4: Critiquing Report";
      const critiquePrompt = `${SELF_CRITIQUE_PROMPT}\n\nReport to Review:\n${reportResponse}`;
      const critiqueResponse = await AI.ask(critiquePrompt);

      updatedProject = {
        ...updatedProject,
        critiqueContent: critiqueResponse,
        currentStep: 4,
      };

      await showHUD("✨ Self-critique completed!");

      // Step 5: Final Report
      toast.message = "Step 5: Generating Final Report";
      const finalPrompt = `${FINAL_REPORT_PROMPT}\n\nOriginal Report:\n${reportResponse}\n\nCritique Feedback:\n${critiqueResponse}`;
      const finalResponse = await AI.ask(finalPrompt);

      updatedProject = {
        ...updatedProject,
        finalReport: finalResponse,
        currentStep: 4,
        status: "completed" as const,
      };

      // Save all changes
      const updatedProjects = projects.map((p) => (p.id === project.id ? updatedProject : p));
      await onSave(updatedProjects);

      toast.style = Toast.Style.Success;
      toast.title = "Research process completed!";
      toast.message = "All steps have been completed successfully";
      await showHUD("🎉 Research process completed!");
    } catch (error) {
      console.error("Error in automated process:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Process failed";
      toast.message = "Please try running steps individually";
      await showHUD("❌ Automated process failed");
    }
  };

  return (
    <List>
      <List.Section title="Warning">
        <List.Item title="Experimental Product. Quit and reopen if issues occur." accessories={[{ text: "⚠️" }]} />
      </List.Section>

      <List.Section title="Project Actions">
        <List.Item
          icon={{ source: Icon.Pencil, tintColor: Color.Blue }}
          title="Edit Project"
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Project"
                icon={Icon.Pencil}
                target={<ProjectForm onSave={onSave} projects={projects} initialProject={project} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Play, tintColor: Color.Green }}
          title="Automatically Run All"
          accessories={[{ text: "⚡️ Runs all steps in order" }]}
          actions={
            <ActionPanel>
              <Action title="Start Automated Process" icon={Icon.Play} onAction={runAllSteps} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Research Steps">
        {RESEARCH_STEPS.map((step, index) => (
          <List.Item
            key={index}
            icon={{ source: Icon[step.icon as keyof typeof Icon], tintColor: getStepColor(index, project.currentStep) }}
            title={`Step ${index + 1}. ${step.title}`}
            accessories={[
              {
                icon:
                  index === project.currentStep
                    ? Icon.Circle
                    : index < project.currentStep
                      ? Icon.CheckCircle
                      : Icon.Circle,
                tooltip:
                  index === project.currentStep
                    ? "Current Step"
                    : index < project.currentStep
                      ? "Completed"
                      : "Not Started",
              },
            ]}
            actions={
              <ActionPanel>
                {index === 0 && (
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<TopicDetail project={project} onSave={onSave} projects={projects} />}
                  />
                )}
                {index === 1 && (
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<GatherInformation project={project} onSave={onSave} projects={projects} />}
                  />
                )}
                {index === 2 && (
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<ReportWriter project={project} onSave={onSave} projects={projects} />}
                  />
                )}
                {index === 3 && (
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<SelfCritique project={project} onSave={onSave} projects={projects} />}
                  />
                )}
                {index === 4 && (
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<FinalReport project={project} onSave={onSave} projects={projects} />}
                  />
                )}
                {index === project.currentStep && index > 4 && (
                  <Action title="Start This Step" icon={Icon.Play} onAction={() => updateProjectStep(index)} />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function getStatusColor(status: ResearchProject["status"]): Color {
  switch (status) {
    case "not_started":
      return Color.Red;
    case "in_progress":
      return Color.Yellow;
    case "completed":
      return Color.Green;
  }
}

function capitalizeStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStepColor(stepIndex: number, currentStep: number): Color {
  if (stepIndex < currentStep) return Color.Green;
  if (stepIndex === currentStep) return Color.Yellow;
  return Color.SecondaryText;
}
