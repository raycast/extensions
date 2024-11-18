import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { Action, ActionPanel, Form } from "@raycast/api";
import { QuarkusVersion } from "./models/QuarkusVersion";
import { Configuration } from "./models/Configuration";
import { BUILD_TOOLS, JAVA_VERSIONS } from "./models/Constants";

export function Configure({
  onVersionChange,
  onConfigurationChange,
}: {
  onVersionChange: (newValue: QuarkusVersion) => void;
  onConfigurationChange: (configuration: Configuration) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [versions, setVersions] = useState<QuarkusVersion[]>([]);

  async function fetchQuarkusVersions() {
    setIsLoading(true);
    const response = await fetch("https://code.quarkus.io/api/streams", {});
    if (!response.ok) {
      setIsLoading(false);
      throw new Error(`Failed to fetch quarkus version: ${response.status} ${response.statusText}`);
    }
    const versions = (await response.json()) as QuarkusVersion[];
    setVersions(versions);
    setIsLoading(false);
  }

  function handleVersionChange(key: string) {
    onVersionChange(versions.filter((v) => v.key === key)[0]);
  }

  function handleSubmit(configuration: Configuration) {
    onConfigurationChange(configuration);
  }

  useEffect(() => {
    fetchQuarkusVersions();
  }, []);

  if (isLoading) {
    return (
      <Form>
        <Form.Description text="Loading Quarkus version... Please wait." />
      </Form>
    );
  }
  if (!versions) {
    return (
      <Form>
        <Form.Description text="Failed to load dependencies. Please try again." />
        <ActionPanel>
          <Action
            title="Retry"
            onAction={() => {
              fetchQuarkusVersions();
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
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Dependencies" />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure your new Quarkus project" />
      <Form.Dropdown id="quarkusVersion" title="Quarkus version" onChange={handleVersionChange}>
        {versions.map((v) => (
          <Form.Dropdown.Item key={v.key} value={v.key} title={v?.platformVersion + (v?.lts ? " [LTS]" : "")} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="buildTool" title="Build tool">
        {BUILD_TOOLS.map((tool) => (
          <Form.Dropdown.Item key={tool.value} value={tool.value} title={tool.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.TextField id="group" title="Group" placeholder="org.acme" defaultValue="org.acme" />
      <Form.TextField id="artifact" title="Artifact" placeholder="code.with.quarkus" defaultValue="code.with.quarkus" />
      <Form.Dropdown id="javaVersion" title="Java version">
        {JAVA_VERSIONS.map((javaVersion) => (
          <Form.Dropdown.Item key={javaVersion} value={javaVersion} title={javaVersion} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="starterCode" label="Include starter code" defaultValue={true} />
    </Form>
  );
}
