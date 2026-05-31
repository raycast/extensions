import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  expandHome,
  resolvePath,
  appendToInbox,
  fileExists,
  listProjectFiles,
} from "./util/storage";
import { appendToProject } from "./util/routing";

interface Preferences {
  mitodosDir: string;
}

export default function Command(props: { arguments?: { text?: string } }) {
  const [taskText, setTaskText] = useState(props.arguments?.text ?? "");
  const [project, setProject] = useState("inbox");
  const prefs = getPreferenceValues<Preferences>();
  const mitodosDir = resolvePath(expandHome(prefs.mitodosDir));

  const { data: projects = [] } = usePromise(() => listProjectFiles(mitodosDir), []);

  async function handleSubmit() {
    const trimmed = taskText.trim();
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Task cannot be empty" });
      return;
    }

    try {
      if (project === "inbox") {
        appendToInbox(mitodosDir, trimmed);
      } else {
        appendToProject(mitodosDir, project, trimmed);
      }
      const dest = project === "inbox" ? "inbox" : project;
      await showHUD(`✓ ${dest}: ${trimmed}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const projectOptions = [
    { title: "📋 Inbox", value: "inbox" },
    ...projects
      .filter((p) => p !== "inbox")
      .map((p) => ({
        title: `📁 ${p}`,
        value: p,
      })),
  ];

  const targetPath = project === "inbox" ? `${mitodosDir}/inbox.md` : `${mitodosDir}/${project}.md`;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="task"
        title="Task"
        placeholder="What needs doing?"
        value={taskText}
        onChange={setTaskText}
        autoFocus
      />
      <Form.Dropdown id="project" title="Route to" value={project} onChange={setProject}>
        {projectOptions.map((opt) => (
          <Form.Dropdown.Item key={opt.value} title={opt.title} value={opt.value} />
        ))}
      </Form.Dropdown>
      <Form.Description
        title="Target"
        text={fileExists(targetPath) ? targetPath : `${targetPath} (will be created)`}
      />
    </Form>
  );
}
