import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { ResearchProject, RESEARCH_STEPS } from "./types";
import { ProjectForm } from "./helpers/components/ProjectForm";
import { TopicViewer } from "./helpers/components/TopicViewer";
import { ReportWriter } from "./helpers/components/ReportWriter";
import { SelfCritique } from "./helpers/components/SelfCritique";
import { FinalReport } from "./helpers/components/FinalReport";
import { loadProjects, saveProjects } from "./helpers/storage";
import { getStatusColor, capitalizeStatus, getStepColor } from "./helpers/utils";

export default function Command() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);

  useEffect(() => {
    loadProjects().then(setProjects);
  }, []);

  const handleSave = async (updatedProjects: ResearchProject[]) => {
    await saveProjects(updatedProjects);
    setProjects(updatedProjects);
  };

  return (
    <List>
      <List.Section title="Warning">
        <List.Item title="_Experimental Product. Quit and reopen if issues occur._" accessories={[{ text: "⚠️" }]} />
      </List.Section>

      <List.Section title="Projects">
        {projects.map((project) => (
          <List.Item
            key={project.id}
            title={project.title}
            subtitle={project.researchPrompt}
            accessories={[
              {
                text: capitalizeStatus(project.status),
                tag: {
                  value: project.status,
                  color: getStatusColor(project.status),
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={<ProjectDetail project={project} onSave={handleSave} projects={projects} />}
                />
                <Action.Push
                  title="Edit Project"
                  icon={Icon.Pencil}
                  target={<ProjectForm onSave={handleSave} projects={projects} initialProject={project} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create New Project"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Project"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<ProjectForm onSave={handleSave} projects={projects} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

interface ProjectDetailProps {
  project: ResearchProject;
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
}

function ProjectDetail({ project, onSave, projects }: ProjectDetailProps) {
  return (
    <List>
      <List.Section title="Warning">
        <List.Item title="_Experimental Product. Quit and reopen if issues occur._" accessories={[{ text: "⚠️" }]} />
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
      </List.Section>

      <List.Section title="Research Steps">
        {RESEARCH_STEPS.map((step, index) => (
          <List.Item
            key={step.title}
            icon={{ source: Icon.LightBulb, tintColor: getStepColor(index, project.currentStep) }}
            title={step.title}
            accessories={[
              {
                text: index === project.currentStep ? "Current Step" : index < project.currentStep ? "✓" : "",
                tag: {
                  value: index === project.currentStep ? "In Progress" : index < project.currentStep ? "Complete" : "",
                  color: getStepColor(index, project.currentStep),
                },
              },
            ]}
            actions={
              <ActionPanel>
                {index === project.currentStep && index === 0 && project.parsedTopics?.[0] && (
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={
                      <TopicViewer
                        project={project}
                        onSave={onSave}
                        projects={projects}
                        topic={project.parsedTopics[0]}
                      />
                    }
                  />
                )}
                {index === project.currentStep &&
                  index === 1 &&
                  project.parsedTopics?.map((topic) => (
                    <Action.Push
                      key={topic.name}
                      title={`Research ${topic.name}`}
                      icon={Icon.Sidebar}
                      target={<TopicViewer project={project} onSave={onSave} projects={projects} topic={topic} />}
                    />
                  ))}
                {index === project.currentStep && index === 2 && (
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<ReportWriter project={project} onSave={onSave} projects={projects} />}
                  />
                )}
                {index === project.currentStep && index === 3 && (
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<SelfCritique project={project} onSave={onSave} projects={projects} />}
                  />
                )}
                {index === project.currentStep && index === 4 && (
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<FinalReport project={project} onSave={onSave} projects={projects} />}
                  />
                )}
                {index === project.currentStep && index > 4 && (
                  <Action
                    title="Start This Step"
                    icon={Icon.Play}
                    onAction={async () => {
                      const updatedProjects = projects.map((p) =>
                        p.id === project.id
                          ? {
                              ...p,
                              currentStep: index,
                              status: "in_progress" as const,
                            }
                          : p,
                      );
                      await onSave(updatedProjects);
                    }}
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
