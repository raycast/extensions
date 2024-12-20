import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { ResearchProject } from "../../types";
import { generateProjectId } from "../utils";

interface ProjectFormProps {
  onSave: (projects: ResearchProject[]) => Promise<void>;
  projects: ResearchProject[];
  initialProject?: ResearchProject;
}

export function ProjectForm({ onSave, projects, initialProject }: ProjectFormProps) {
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
      const newProject: ResearchProject = {
        id: generateProjectId(),
        title: values.title,
        model: values.model,
        researchPrompt: values.researchPrompt,
        status: "not_started",
        currentStep: 0,
      };
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
        <Form.Dropdown.Item value="Anthropic_Claude_Sonnet" title="Anthropic/Claude-3.5-Sonnet" />
        <Form.Dropdown.Item value="Anthropic_Claude_Haiku" title="Anthropic/Claude-3.5-Haiku" />
        <Form.Dropdown.Item value="Anthropic_Claude_Opus" title="Anthropic/Claude-3-Opus" />
        <Form.Dropdown.Item value="OpenAI_GPT4o" title="OpenAI/GPT4o" />
        <Form.Dropdown.Item value="OpenAI_GPT4o-mini" title="OpenAI/GPT4o-Mini" />
        <Form.Dropdown.Item value="Llama3.3_70B" title="Meta/Llama-3.3-70B" />
        <Form.Dropdown.Item value="Llama3_70B" title="Meta/Llama-3-70B" />
        <Form.Dropdown.Item value="Llama3.1_8B" title="Meta/Llama-3.1-8B" />
        <Form.Dropdown.Item value="Llama3.1_405B" title="Meta/Llama-3.1-405B" />
      </Form.Dropdown>
    </Form>
  );
}

export function CreateProjectForm({ onSave, projects }: Omit<ProjectFormProps, "initialProject">) {
  return <ProjectForm onSave={onSave} projects={projects} />;
}
