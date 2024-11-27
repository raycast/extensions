import fetch from "node-fetch";
import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import path from "path";
import { writeFileSync } from "fs";
import { QuarkusVersion } from "./models/QuarkusVersion";
import { Configuration } from "./models/Configuration";
import { Dependency } from "./models/Dependency";

export function Dependencies({ version, configuration }: { version: QuarkusVersion; configuration: Configuration }) {
  const [isLoading, setIsLoading] = useState(true);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);

  async function fetchDependencies() {
    try {
      setIsLoading(true);
      console.log("Fetching dependencies...");
      //const response = {ok:false, status:'', statusText:'',json: () => Promise.resolve([])};
      const response = await fetch(
        `https://code.quarkus.io/api/extensions/stream/${version.key}?platformOnly=false`,
        {},
      );

      console.log("Response status:", response.status);

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
    const baseUrl = "https://code.quarkus.io/d";
    const params = new URLSearchParams();

    // Add the required fields
    params.set("j", config.javaVersion);
    params.set("S", config.quarkusVersion);
    params.set("cn", "code.quarkus.io");

    // Add build tool
    params.set("b", config.buildTool);

    // Add group ID, artifact ID, and version if provided
    if (config.group) params.set("g", config.group);
    if (config.artifact) params.set("a", config.artifact);

    // Add starter code flag
    params.set("nc", config.starterCode ? "false" : "true");

    // Add dependencies
    if (config.dependencies) {
      config.dependencies.forEach((dependency) => {
        params.append("e", dependency);
      });
    }

    // Return the generated URL
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
      const buffer = await response.buffer();

      // Save to Downloads folder (macOS)
      const homeDir = process.env.HOME;
      const downloadsPath = path.join(homeDir || "", "Downloads", `${configuration.artifact}.zip`);

      writeFileSync(downloadsPath, buffer);

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

  function setConfigDependencies(deps: string[]) {
    configuration.dependencies = deps;
  }

  useEffect(() => {
    fetchDependencies();
  }, []);

  if (isLoading) {
    return (
      <Form>
        <Form.Description text="Loading Code.Quarkus metadata... Please wait." />
      </Form>
    );
  }

  if (!dependencies) {
    return (
      <Form>
        <Form.Description text="Failed to load dependencies. Please try again." />
        <ActionPanel>
          <Action
            title="Retry"
            onAction={() => {
              fetchDependencies();
            }}
          />
        </ActionPanel>
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Generate Project" />
        </ActionPanel>
      }
    >
      <Form.Description text="Add dependencies to your new Quarkus project" />
      <Form.Description title="Quarkus version" text={version?.platformVersion + (version?.lts ? " [LTS]" : "")} />
      <Form.Description title="Build tool" text={configuration.buildTool} />
      <Form.Description title="Group" text={configuration.group} />
      <Form.Description title="Artifact" text={configuration.artifact} />
      <Form.Description title="Java version" text={configuration.javaVersion} />
      <Form.Description title="Sarter Code" text={configuration.starterCode ? "Yes" : "No"} />
      <Form.Separator />
      <Form.TagPicker id="dependencies" title="Dependencies" onChange={setConfigDependencies}>
        {dependencies.map((dep) => (
          <Form.TagPicker.Item
            key={dep.id + ":" + dep.order}
            value={dep.id}
            title={dep.name + " [" + dep.id.split(":")[1] + "]"}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
