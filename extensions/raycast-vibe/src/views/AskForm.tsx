import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { Agent } from "../agents";
import { BUILTIN_TEMPLATES } from "../templates";
import { AskDetail } from "./AskDetail";

export function AskForm({
  folder,
  repoRoot,
  agent,
  initialQuestion,
}: {
  folder: { path: string; name: string };
  repoRoot: string;
  agent: Agent;
  initialQuestion?: string;
}) {
  const { push } = useNavigation();
  const [preset, setPreset] = React.useState<string>("custom");
  const [question, setQuestion] = React.useState<string>(initialQuestion ?? "");

  const onPreset = (id: string) => {
    setPreset(id);
    if (id === "custom") return;
    const template = BUILTIN_TEMPLATES.find((t) => t.id === id);
    if (template) setQuestion(template.prompt);
  };

  return (
    <Form
      navigationTitle={`Ask ${agent.name} about ${folder.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            onSubmit={async () => {
              const trimmed = question.trim();
              if (!trimmed) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Question is required",
                });
                return;
              }
              push(
                <AskDetail
                  folder={folder}
                  repoRoot={repoRoot}
                  agent={agent}
                  question={trimmed}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="preset"
        title="Preset"
        value={preset}
        onChange={onPreset}
      >
        <Form.Dropdown.Item value="custom" title="Custom" />
        {BUILTIN_TEMPLATES.map((t) => (
          <Form.Dropdown.Item key={t.id} value={t.id} title={t.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="question"
        title="Question"
        value={question}
        onChange={setQuestion}
        placeholder="What do you want to know about this repo?"
      />
    </Form>
  );
}
