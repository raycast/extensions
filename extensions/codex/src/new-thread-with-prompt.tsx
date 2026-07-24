import {
  Action,
  ActionPanel,
  Form,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { openNewCodexThread } from "./utils/codex-launch";
import { loadNewThreadProjectOptions } from "./utils/codex-projects";
import { getProjectName, tildeifyPath } from "./utils/format";
import { expandTildePath } from "./utils/shell";

type FormValues = {
  prompt: string;
  path?: string;
};

const USE_DEFAULT_PROJECT_VALUE = "__codex_use_default_project__";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedProjectPath, setSelectedProjectPath] = useState(
    USE_DEFAULT_PROJECT_VALUE,
  );
  const projectOptionsInput = useMemo(
    () => ({
      defaultProjectDirectory: preferences.defaultProjectDirectory,
      projectsDirectory: preferences.projectsDirectory,
    }),
    [preferences.defaultProjectDirectory, preferences.projectsDirectory],
  );
  const { data: projectOptionsResult, isLoading: isLoadingProjectOptions } =
    usePromise(loadNewThreadProjectOptions, [projectOptionsInput]);
  const projectOptions = projectOptionsResult?.options ?? [];
  const recentProjectOptions = useMemo(
    () => projectOptions.filter((option) => option.count > 0),
    [projectOptions],
  );
  const folderProjectOptions = useMemo(
    () => projectOptions.filter((option) => option.count === 0),
    [projectOptions],
  );
  const { handleSubmit, itemProps } = useForm<FormValues>({
    validation: {
      prompt: (value) => {
        if (!value?.trim()) {
          return "Prompt is required";
        }

        return undefined;
      },
    },
    onSubmit: async (values) => {
      try {
        const customPath = values.path?.trim();
        const selectedPath =
          selectedProjectPath === USE_DEFAULT_PROJECT_VALUE
            ? undefined
            : selectedProjectPath;

        await openNewCodexThread({
          path: customPath || selectedPath,
          prompt: values.prompt,
        });
      } catch (error) {
        await showFailureToast(error, {
          title: "Unable to start Codex thread",
        });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Thread"
            icon={Icon.Stars}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Prompt"
        placeholder="Describe the task for Codex..."
        autoFocus
        {...itemProps.prompt}
      />
      <Form.Dropdown
        id="project"
        title="Project"
        placeholder="Search recent projects..."
        value={selectedProjectPath}
        onChange={setSelectedProjectPath}
        info={getProjectPickerInfo({
          isLoading: isLoadingProjectOptions,
          projectsDirectory: preferences.projectsDirectory,
          warning: projectOptionsResult?.warning ?? null,
        })}
      >
        <Form.Dropdown.Item
          value={USE_DEFAULT_PROJECT_VALUE}
          title={getDefaultProjectTitle(preferences.defaultProjectDirectory)}
          icon={Icon.Circle}
          keywords={getDefaultProjectKeywords(
            preferences.defaultProjectDirectory,
          )}
        />
        {recentProjectOptions.length > 0 ? (
          <Form.Dropdown.Section title="Recent Projects">
            {recentProjectOptions.map((option) => (
              <Form.Dropdown.Item
                key={option.cwd}
                value={option.cwd}
                title={option.title}
                icon={{ source: Icon.Circle, tintColor: option.color }}
                keywords={option.keywords}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
        {folderProjectOptions.length > 0 ? (
          <Form.Dropdown.Section title="Projects Folder">
            {folderProjectOptions.map((option) => (
              <Form.Dropdown.Item
                key={option.cwd}
                value={option.cwd}
                title={option.title}
                icon={{ source: Icon.Folder, tintColor: option.color }}
                keywords={option.keywords}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
      </Form.Dropdown>
      <Form.TextField
        title="Custom Path"
        placeholder="Optional absolute path. Overrides the selected project."
        {...itemProps.path}
      />
    </Form>
  );
}

function getDefaultProjectTitle(
  defaultProjectDirectory: string | undefined,
): string {
  const defaultPath = defaultProjectDirectory?.trim();
  if (!defaultPath) {
    return "No Project";
  }

  const expandedDefaultPath = expandTildePath(defaultPath);
  return `Use Default: ${getProjectName(expandedDefaultPath)}`;
}

function getDefaultProjectKeywords(
  defaultProjectDirectory: string | undefined,
): string[] {
  const defaultPath = defaultProjectDirectory?.trim();
  if (!defaultPath) {
    return ["none", "no project"];
  }

  const expandedDefaultPath = expandTildePath(defaultPath);
  return [
    "default",
    getProjectName(expandedDefaultPath),
    tildeifyPath(expandedDefaultPath),
    expandedDefaultPath,
  ];
}

function getProjectPickerInfo({
  isLoading,
  projectsDirectory,
  warning,
}: {
  isLoading: boolean;
  projectsDirectory?: string;
  warning: string | null;
}): string | undefined {
  if (warning) {
    return warning;
  }

  if (isLoading) {
    return "Loading recent projects.";
  }

  return projectsDirectory?.trim()
    ? "Recent projects are sorted by Codex thread activity. Custom Path overrides this selection."
    : "Set Projects Folder in preferences to add local folder choices. Custom Path overrides this selection.";
}
