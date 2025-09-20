import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, openCommandPreferences, useNavigation } from "@raycast/api";
import { QuarkusVersion } from "./models/QuarkusVersion";
import { Configuration } from "./models/Configuration";
import { BUILD_TOOLS, JAVA_VERSIONS } from "./models/Constants";
import { Dependencies } from "./Dependencies";
import { getQuarkusVersion } from "./api";

export function Configure() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [versions, setVersions] = useState<QuarkusVersion[]>([]);
  const [version, setVersion] = useState<QuarkusVersion | null>(null);

  async function fetchQuarkusVersions() {
    setIsLoading(true);
    const response = await getQuarkusVersion();
    if (!response.ok) {
      setIsLoading(false);
      throw new Error(`Failed to fetch quarkus version: ${response.status} ${response.statusText}`);
    }
    const versions = (await response.json()) as QuarkusVersion[];
    setVersions(versions);
    setIsLoading(false);
  }

  function handleVersionChange(key: string) {
    setVersion(versions.filter((v) => v.key === key)[0]);
  }

  function handleSubmit(configuration: Configuration) {
    push(<Dependencies version={version || versions[0]} configuration={configuration} />);
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
          <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
      navigationTitle={"Configure your new Quarkus project"}
    >
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
      <Form.TextField id="version" title="Version" placeholder="1.0.0-SNAPSHOT" defaultValue="1.0.0-SNAPSHOT" />
      <Form.Dropdown id="javaVersion" title="Java version">
        {JAVA_VERSIONS.map((javaVersion) => (
          <Form.Dropdown.Item key={javaVersion} value={javaVersion} title={javaVersion} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="starterCode" label="Include starter code" defaultValue={true} />
    </Form>
  );
}
