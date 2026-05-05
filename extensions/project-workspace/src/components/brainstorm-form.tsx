import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { createBrainstorm, updateBrainstorm } from "../brainstorm-data";
import { Brainstorm } from "../brainstorm-types";
import { loadHydratedProjectCache } from "../project-records";
import { loadStorageState } from "../storage";

interface ProjectOption {
  path: string;
  name: string;
}

interface BrainstormFormProps {
  brainstorm?: Brainstorm;
  defaultProjectPath?: string;
  onSave?: () => void;
}

export function BrainstormForm({ brainstorm, defaultProjectPath, onSave }: BrainstormFormProps) {
  const { pop } = useNavigation();
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const storageState = await loadStorageState();
        const projects = await loadHydratedProjectCache(storageState);
        setProjectOptions(
          projects.map((p) => ({
            path: p.path,
            name: p.displayName ?? p.directoryName,
          })),
        );
      } finally {
        setIsLoadingProjects(false);
      }
    })();
  }, []);

  const handleSubmit = useCallback(
    async (values: { title: string; content: string; projectPath: string }) => {
      if (!values.title.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "Title is required" });
        return;
      }

      const fields = {
        title: values.title.trim(),
        content: values.content.trim(),
        projectPath: values.projectPath || undefined,
      };

      if (brainstorm) {
        updateBrainstorm(brainstorm.id, fields);
        await showToast({ style: Toast.Style.Success, title: "Brainstorm updated" });
      } else {
        createBrainstorm(fields);
        await showToast({ style: Toast.Style.Success, title: "Brainstorm created" });
      }

      onSave?.();
      pop();
    },
    [brainstorm, onSave, pop],
  );

  const formKey = isLoadingProjects ? "loading" : "ready";

  return (
    <Form
      key={formKey}
      isLoading={isLoadingProjects}
      navigationTitle={brainstorm ? "Edit Brainstorm" : "New Brainstorm"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={brainstorm ? "Save Changes" : "Create"}
            onSubmit={(v) => void handleSubmit(v as { title: string; content: string; projectPath: string })}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="What are you brainstorming about?"
        defaultValue={brainstorm?.title ?? ""}
        autoFocus
      />
      <Form.Dropdown
        id="projectPath"
        title="Project"
        defaultValue={brainstorm?.projectPath ?? defaultProjectPath ?? ""}
      >
        <Form.Dropdown.Item value="" title="None" />
        {projectOptions.map((p) => (
          <Form.Dropdown.Item key={p.path} value={p.path} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Dump your ideas here… (Markdown supported)"
        defaultValue={brainstorm?.content ?? ""}
        enableMarkdown
      />
    </Form>
  );
}
