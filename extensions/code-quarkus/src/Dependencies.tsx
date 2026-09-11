import {
  Action,
  ActionPanel,
  Form,
  openCommandPreferences,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import path from "path";
import { writeFileSync } from "fs";
import { QuarkusVersion } from "./models/QuarkusVersion";
import { Configuration } from "./models/Configuration";
import { Dependency } from "./models/Dependency";
import { getCodeQuarkusUrl, getParams, openInIDE, unzipFile } from "./utils";
import { showInFinder } from "@raycast/api";
import { BASE_URL, fetchQuarkusExtensions } from "./api";
import { getPreferenceValues } from "@raycast/api";
import { CodePreferences } from "./models/CodePreferences";

export function Dependencies({ version, configuration }: { version: QuarkusVersion; configuration: Configuration }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const preferences = getPreferenceValues<CodePreferences>();

  async function fetchDependencies() {
    try {
      setIsLoading(true);
      const response = await fetchQuarkusExtensions(version.key);
      if (!response.ok) {
        throw new Error(`Failed to fetch Quarkus dependencies: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as Dependency[];
      console.log("Metadata received successfully");

      setDependencies(data);
      setIsLoading(false);

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Metadata loaded successfully",
      });
    } catch (error) {
      console.error("Error fetching metadata:", error);
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load metadata",
      });
    }
  }

  function generateQuarkusUrl(config: Configuration): string {
    const baseUrl = `${BASE_URL}/d`;
    const params = getParams(config);
    return `${baseUrl}?${params.toString()}`;
  }

  async function handleSubmit() {
    try {
      console.log("Submitting form with values:", configuration);
      const url = generateQuarkusUrl(configuration);
      await showToast({ title: "Submitted form", message: "See logs for submitted values" });

      // Show generating toast
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating project...",
      });

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to generate project: ${response.statusText}`);
      }

      // Convert the response to a buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const homeDir = process.env.HOME;
      let dir = path.join(homeDir || "", "Downloads");
      console.log("preferences", JSON.stringify(preferences));
      if (preferences.directory) {
        dir = preferences.directory;
      }
      const downloadsPath = path.join(dir, `${configuration.artifact}.zip`);
      console.log("configured directory:", downloadsPath);

      writeFileSync(downloadsPath, buffer);

      await afterDownload(dir);

      await showToast({
        style: Toast.Style.Success,
        title: "Project Downloaded",
        message: `Saved to Downloads folder as ${configuration.artifact}.zip`,
      });
      await popToRoot();
    } catch (error) {
      console.error("Error generating project:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to generate project",
      });
    }
  }

  async function afterDownload(dir: string): Promise<void> {
    const directoryPath = path.join(dir, configuration.artifact);
    const downloadsPath = `${directoryPath}.zip`;
    if (!preferences.unzip) return;
    const success = unzipFile(downloadsPath, dir);
    if (!success) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to unzip project",
      });
      return;
    }

    if (preferences.showInFinder) {
      console.debug("opening finder", directoryPath);
      await showInFinder(directoryPath);
    }
    if (!preferences.openInIDE) {
      console.debug("Not opening an IDE");
      return;
    }
    if (!preferences.ide) {
      console.warn("Not IDE configured");
      await showToast({
        style: Toast.Style.Failure,
        title: "No IDE selected",
        message: "Please select an IDE in extension preferences",
      });
      return;
    }
    await openInIDE(directoryPath, preferences.ide);
  }

  function setConfigDependencies(deps: string[]) {
    configuration.dependencies = deps;
  }

  function getUrl() {
    return getCodeQuarkusUrl(configuration);
  }

  useEffect(() => {
    fetchDependencies();
  }, []);

  if (isLoading) {
    return (
      <Form>
        <Form.Description text="🔄 Loading Quarkus extensions..." />
        <Form.Description text={`Fetching available dependencies for Quarkus ${version?.platformVersion || ""}...`} />
      </Form>
    );
  }

  if (!dependencies || dependencies.length === 0) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.RotateClockwise}
              onAction={() => {
                fetchDependencies();
              }}
            />
            <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      >
        <Form.Description text="❌ Failed to load dependencies" />
        <Form.Description text="Unable to fetch Quarkus extensions. Please check your connection and try again." />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Download} onSubmit={handleSubmit} title="Generate Project" />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.OpenInBrowser icon={Icon.Globe} title="Open in Browser" url={getUrl()} />
          <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Configuration URL" content={getUrl()} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
        </ActionPanel>
      }
      navigationTitle={"Add dependencies to your new Quarkus project"}
    >
      <Form.Description text={`Quarkus version: ${version?.platformVersion + (version?.lts ? " [LTS]" : "")}`} />
      <Form.Description text={`Build tool: ${configuration.buildTool}`} />
      <Form.Description text={`Group: ${configuration.group}`} />
      <Form.Description text={`Artifact: ${configuration.artifact}`} />
      <Form.Description text={`Version: ${configuration.version}`} />
      <Form.Description text={`Java version: ${configuration.javaVersion}`} />
      <Form.Description text={`Starter Code: ${configuration.starterCode ? "Yes" : "No"}`} />
      <Form.Separator />
      <Form.TagPicker id="dependencies" title="Dependencies" onChange={setConfigDependencies}>
        {dependencies.map((dep) => {
          const icon = dep.platform ? Icon.Star : dep.providesExampleCode ? Icon.Code : Icon.Box;
          return <Form.TagPicker.Item key={dep.id + ":" + dep.order} value={dep.id} title={dep.name} icon={icon} />;
        })}
      </Form.TagPicker>
    </Form>
  );
}
