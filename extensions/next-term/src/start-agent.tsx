import { Action, ActionPanel, Form, Icon, popToRoot, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { agents, call, failed, link, name, projects, Projects, shown } from "./nextterm";

interface Values {
  project: string;
  agent: string;
  prompt: string;
}

export default function Command() {
  const { data, isLoading } = usePromise(async () => projects(await call<Projects>("list_projects")));
  async function start(values: Values) {
    const agent = agents.find((item) => item.command === values.agent) ?? agents[0];
    try {
      const tab = await call<{ id: string }>("new_tab", {
        directory: values.project,
        command: agent.command,
        title: agent.title,
        ...(values.prompt.trim() ? { prompt: values.prompt.trim() } : {}),
      });
      await link("tab", { id: tab.id });
      await showHUD(`${agent.title} started in ${name(values.project)}`);
      await popToRoot();
    } catch (error) {
      await failed(error);
    }
  }
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Agent" icon={Icon.Stars} onSubmit={start} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="project" title="Project" storeValue>
        {(data ?? []).map((project) => (
          <Form.Dropdown.Item
            key={project.path}
            value={project.path}
            title={`${name(project.path)}  ${shown(project.path)}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="agent" title="Agent" storeValue>
        {agents.map((agent) => (
          <Form.Dropdown.Item key={agent.command} value={agent.command} title={agent.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="prompt" title="First Prompt" placeholder="Optional: what to do first" />
    </Form>
  );
}
