import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import {
  showFailureToast,
  useCachedPromise,
  useForm,
  usePromise,
} from "@raycast/utils";
import { useMemo, useState } from "react";
import { openNewCodexThread } from "./utils/launch";
import { validateOnSubmitOnly } from "./utils/raycast";
import {
  buildProjectsFolderOptions,
  loadProjectsFolderRecords,
  loadRecentWorkingDirectoryRecords,
} from "./utils/projects";
import { getProjectName, tildeifyPath } from "./utils/format";
import { expandTildePath } from "./utils/shell";

type FormValues = {
  prompt: string;
  path?: string[];
};

const defaultDirectoryItemValue = "__codex_use_default_project__";
const customPathItemValue = "__codex_custom_path__";
const projectsFolderTip =
  "Tip: Set a Working Directory Root in the extension settings to list its subfolders here.";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultWorkingDirectory = preferences.defaultProjectDirectory;
  const workingDirectoryRoot = preferences.projectsDirectory?.trim();
  const [selectedDirectoryValue, setSelectedDirectoryValue] = useState(
    defaultDirectoryItemValue,
  );
  const isCustomPath = selectedDirectoryValue === customPathItemValue;

  const folderScan = usePromise(loadProjectsFolderRecords, [
    preferences.projectsDirectory,
  ]);
  const recentHistory = useCachedPromise(
    loadRecentWorkingDirectoryRecords,
    [],
    {
      // Counts only decorate folders under the Working Directory Root.
      execute: Boolean(folderScan.data?.records.length),
      failureToastOptions: { title: "Couldn't load thread counts" },
    },
  );

  const folderOptions = useMemo(() => {
    if (!folderScan.data) {
      return [];
    }

    return buildProjectsFolderOptions({
      folderRecords: folderScan.data.records,
      recentRecords: recentHistory.data ?? [],
      defaultProjectDirectory: defaultWorkingDirectory,
    });
  }, [folderScan.data, recentHistory.data, defaultWorkingDirectory]);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    validation: {
      prompt: (value) => {
        if (!value?.trim()) {
          return "Prompt is required";
        }

        return undefined;
      },
      path: (value) => {
        if (isCustomPath && !value?.length) {
          return "Custom path is required";
        }

        return undefined;
      },
    },
    onSubmit: async (values) => {
      try {
        await openNewCodexThread({
          path: resolveSubmittedPath(selectedDirectoryValue, values.path),
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
      isLoading={folderScan.isLoading}
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
        placeholder="Describe the task for Codex…"
        autoFocus
        {...validateOnSubmitOnly(itemProps.prompt)}
      />
      <Form.Dropdown
        id="workingDirectory"
        title="Working Directory"
        placeholder="Search folders…"
        value={selectedDirectoryValue}
        onChange={setSelectedDirectoryValue}
        info={getWorkingDirectoryInfo({
          hasProjectsFolder: Boolean(preferences.projectsDirectory?.trim()),
          folderWarning: folderScan.data?.warning ?? null,
          recentUnavailable: Boolean(
            recentHistory.error && !recentHistory.data,
          ),
        })}
      >
        <Form.Dropdown.Item
          value={defaultDirectoryItemValue}
          title={getDefaultDirectoryTitle(defaultWorkingDirectory)}
          icon={{ source: Icon.Star, tintColor: Color.Yellow }}
          keywords={getDefaultDirectoryKeywords(defaultWorkingDirectory)}
        />
        <Form.Dropdown.Item
          value={customPathItemValue}
          title="Choose Folder"
          icon={Icon.Folder}
          keywords={["custom", "path", "other"]}
        />
        {folderOptions.length > 0 && workingDirectoryRoot ? (
          <Form.Dropdown.Section
            title={`Folders in ${tildeifyPath(expandTildePath(workingDirectoryRoot))}`}
          >
            {folderOptions.map((option) => (
              <Form.Dropdown.Item
                key={option.cwd}
                value={option.cwd}
                title={option.title}
                icon={{ fileIcon: option.cwd }}
                keywords={option.keywords}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
      </Form.Dropdown>
      {isCustomPath ? (
        <Form.FilePicker
          title="Custom Path"
          canChooseDirectories
          canChooseFiles={false}
          allowMultipleSelection={false}
          autoFocus
          {...validateOnSubmitOnly(itemProps.path)}
        />
      ) : null}
    </Form>
  );
}

function resolveSubmittedPath(
  selectedDirectoryValue: string,
  customPath: string[] | undefined,
): string | undefined {
  if (selectedDirectoryValue === customPathItemValue) {
    return customPath?.[0];
  }

  if (selectedDirectoryValue === defaultDirectoryItemValue) {
    return undefined;
  }

  return selectedDirectoryValue;
}

function getDefaultDirectoryTitle(
  defaultProjectDirectory: string | undefined,
): string {
  const defaultPath = defaultProjectDirectory?.trim();
  if (!defaultPath) {
    return "No Working Directory";
  }

  return tildeifyPath(expandTildePath(defaultPath));
}

function getDefaultDirectoryKeywords(
  defaultProjectDirectory: string | undefined,
): string[] {
  const defaultPath = defaultProjectDirectory?.trim();
  if (!defaultPath) {
    return ["none", "no working directory"];
  }

  const expandedDefaultPath = expandTildePath(defaultPath);
  return [
    "default",
    getProjectName(expandedDefaultPath),
    tildeifyPath(expandedDefaultPath),
    expandedDefaultPath,
  ];
}

function getWorkingDirectoryInfo({
  hasProjectsFolder,
  folderWarning,
  recentUnavailable,
}: {
  hasProjectsFolder: boolean;
  folderWarning: string | null;
  recentUnavailable: boolean;
}): string {
  const lines = [
    "Sets the folder the new thread works in. This does not add it to a Codex desktop Project.",
  ];

  if (!hasProjectsFolder) {
    lines.push(projectsFolderTip);
  }

  if (folderWarning) {
    lines.push(folderWarning);
  }

  if (recentUnavailable) {
    lines.push(
      "Thread counts unavailable. Configured folders are still available.",
    );
  }

  return lines.join("\n");
}
