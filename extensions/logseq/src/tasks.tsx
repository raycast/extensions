import { Action, ActionPanel, Form, showHUD, showToast, Toast, useNavigation, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  appendContentToFile,
  getTodayJournalPath,
  getWorkflowStyle,
  noop,
  showGraphPathInvalidToast,
  validateUserConfigGraphPath,
} from "./utils";

interface TaskForm {
  when: string;
  task: string;
  scope: string;
}

interface Option {
  title: string;
  value: string;
}

const useWorkflowStyle = (): [Option[], boolean] => {
  const [whenOptions, setWhenOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflowStyle = async () => {
      const style = await getWorkflowStyle();
      if (style == "todo") {
        setWhenOptions([
          { title: "Todo", value: "TODO" },
          { title: "Doing", value: "DOING" },
        ]);
      } else {
        setWhenOptions([
          { title: "Now", value: "NOW" },
          { title: "Later", value: "LATER" },
        ]);
      }
      setIsLoading(false);
    };

    fetchWorkflowStyle();
  }, []);

  return [whenOptions, isLoading];
};

function getScopes(): string[] {
  const scopesRaw: string = getPreferenceValues().taskScopes;
  if (scopesRaw) {
    return scopesRaw.split(",");
  }

  return [];
}

export default function Task() {
  const { pop } = useNavigation();
  const [whenOptions, isLoading] = useWorkflowStyle();

  const scopes = getScopes();

  async function handleSubmit(values: TaskForm): Promise<boolean> {
    if (!values.task) {
      showToast({
        style: Toast.Style.Failure,
        title: "🐝 Type something to get started",
      });
      return false;
    }

    let content = `${values.when} ${values.task}`;
    if (values.scope) {
      content += ` #${values.scope}`;
    }

    validateUserConfigGraphPath()
      .catch((e) => {
        showGraphPathInvalidToast();
        throw e;
      })
      .then(() => showToast({ style: Toast.Style.Animated, title: "Adding task" }))
      .then(getTodayJournalPath)
      .then((filePath) => appendContentToFile(content, filePath))
      .then(() => showHUD("✅ Task added"))
      .then(pop)
      .catch((e) => showToast({ style: Toast.Style.Failure, title: "Failed", message: e }))
      .catch(noop);

    return true;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="task" title="Task" placeholder="Enter your task" />
      <Form.Dropdown id="when" title="When">
        {whenOptions.map((whenOption: Option) => {
          return <Form.Dropdown.Item value={whenOption.value} title={whenOption.title} key={whenOption.value} />;
        })}
      </Form.Dropdown>
      {scopes.length && (
        <Form.Dropdown id="scope" title="Scope">
          {scopes.map((scope) => {
            return <Form.Dropdown.Item value={scope} title={scope} key={scope} />;
          })}
        </Form.Dropdown>
      )}
    </Form>
  );
}
