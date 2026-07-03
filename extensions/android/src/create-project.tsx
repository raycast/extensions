import {
  Action,
  ActionPanel,
  Form,
  Icon,
  getPreferenceValues,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import os from "os";
import { NotInstalled } from "./components/NotInstalled";
import { openProject } from "./list-android";
import {
  ProjectTemplate,
  expandHome,
  getAndroidCliPath,
  installAndroidCli,
  projectDestination,
  runCreateProject,
  runTemplateList,
} from "./util/androidCli";

// Curated minimum-SDK choices. `android create` defaults to the template's own
// minSdk when the flag is omitted, but the form always sends an explicit value
// the developer picked. Labels pair the API level with its platform version.
const MIN_SDK_OPTIONS: { value: string; label: string }[] = [
  { value: "24", label: "API 24 — Android 7.0" },
  { value: "26", label: "API 26 — Android 8.0" },
  { value: "28", label: "API 28 — Android 9" },
  { value: "29", label: "API 29 — Android 10" },
  { value: "30", label: "API 30 — Android 11" },
  { value: "31", label: "API 31 — Android 12" },
  { value: "33", label: "API 33 — Android 13" },
  { value: "34", label: "API 34 — Android 14" },
  { value: "35", label: "API 35 — Android 15" },
  { value: "36", label: "API 36 — Android 16" },
];

const DEFAULT_MIN_SDK = "24";

type CliState = "checking" | "missing" | "ready";

export default function Command() {
  const [cliState, setCliState] = useState<CliState>("checking");

  useEffect(() => {
    getAndroidCliPath()
      .then((path) => setCliState(path ? "ready" : "missing"))
      .catch((error) => {
        console.error(
          "[android] Create Project: CLI resolution failed:",
          error
        );
        setCliState("missing");
      });
  }, []);

  async function handleInstall() {
    const path = await installAndroidCli();
    if (path) {
      setCliState("ready");
    }
  }

  if (cliState === "missing") {
    return <NotInstalled onInstall={handleInstall} />;
  }

  return <CreateProjectForm cliReady={cliState === "ready"} />;
}

function CreateProjectForm({ cliReady }: { cliReady: boolean }) {
  const defaultOutputDir = expandHome(
    (
      getPreferenceValues().androidProjectsDirectory as string | undefined
    )?.trim() || "",
    os.homedir()
  );

  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [template, setTemplate] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!cliReady) {
      return;
    }
    runTemplateList()
      .then((loaded) => {
        setTemplates(loaded);
        // Seed the selection with the CLI's default template (or the first).
        const initial =
          loaded.find((entry) => entry.isDefault)?.name ?? loaded[0]?.name;
        setTemplate(initial);
      })
      .catch((error) => {
        console.error(
          "[android] Create Project: load templates failed:",
          error
        );
        return showToast(
          Toast.Style.Failure,
          "Couldn't load templates",
          String(error)
        );
      })
      .finally(() => setIsLoading(false));
  }, [cliReady]);

  async function handleSubmit(values: {
    template: string;
    name: string;
    minSdk: string;
    outputDir: string;
  }) {
    if (!values.template) {
      await showToast(Toast.Style.Failure, "Select a template");
      return;
    }
    const name = values.name.trim();
    if (name.length === 0) {
      await showToast(Toast.Style.Failure, "App name is required");
      return;
    }
    if (values.outputDir.trim().length === 0) {
      await showToast(Toast.Style.Failure, "Output directory is required");
      return;
    }

    const destination = projectDestination(
      expandHome(values.outputDir.trim(), os.homedir()),
      name
    );
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${name}…`,
    });
    try {
      const projectPath = await runCreateProject({
        template: values.template,
        name,
        minSdk: values.minSdk,
        outputDir: destination,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Project created";
      openProject(projectPath);
      await popToRoot();
    } catch (error) {
      console.error("[android] Create Project: create failed:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create project";
      toast.message = String(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Project"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="template"
        title="Template"
        value={template}
        onChange={setTemplate}
      >
        {templates.map((entry) => (
          <Form.Dropdown.Item
            key={entry.name}
            value={entry.name}
            title={`${entry.description} (${entry.name})`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="name" title="App Name" placeholder="My Application" />
      <Form.Dropdown
        id="minSdk"
        title="Minimum SDK"
        defaultValue={DEFAULT_MIN_SDK}
      >
        {MIN_SDK_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.label}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="outputDir"
        title="Output Directory"
        placeholder="/Users/you/AndroidStudioProjects"
        defaultValue={defaultOutputDir}
        info="The project is created in a subfolder named after the app, inside this directory."
      />
    </Form>
  );
}
