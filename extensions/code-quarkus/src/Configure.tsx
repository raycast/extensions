import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  openCommandPreferences,
  useNavigation,
  showToast,
  Toast,
  Icon,
  LocalStorage,
} from "@raycast/api";
import { QuarkusVersion } from "./models/QuarkusVersion";
import { Configuration } from "./models/Configuration";
import { BUILD_TOOLS, JAVA_VERSIONS } from "./models/Constants";
import { Dependencies } from "./Dependencies";
import { getQuarkusVersion } from "./api";
import { SavedConfiguration } from "./models/SavedConfiguration";

export function Configure() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<QuarkusVersion[]>([]);
  const [version, setVersion] = useState<QuarkusVersion | null>(null);
  const [savedConfig, setSavedConfig] = useState<SavedConfiguration | null>(null);
  const [saveAsPreferred, setSaveAsPreferred] = useState(false);

  async function fetchQuarkusVersions() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getQuarkusVersion();
      if (!response.ok) {
        throw new Error(`Failed to fetch Quarkus versions: ${response.status} ${response.statusText}`);
      }
      const versions = (await response.json()) as QuarkusVersion[];
      setVersions(versions);
      setIsLoading(false);

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Loaded ${versions.length} Quarkus versions`,
      });
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : "Failed to load Quarkus versions";
      setError(errorMessage);

      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    }
  }

  function handleVersionChange(key: string) {
    setVersion(versions.filter((v) => v.key === key)[0]);
  }

  async function handleSubmit(configuration: Configuration) {
    // Save configuration if the checkbox is checked
    if (saveAsPreferred) {
      const configToSave: SavedConfiguration = {
        quarkusVersionKey: configuration.quarkusVersion,
        buildTool: configuration.buildTool,
        group: configuration.group,
        artifact: configuration.artifact,
        version: configuration.version,
        javaVersion: configuration.javaVersion,
        starterCode: configuration.starterCode,
      };
      await LocalStorage.setItem("preferredConfiguration", JSON.stringify(configToSave));
      await showToast({
        style: Toast.Style.Success,
        title: "Configuration saved",
        message: "Your preferred configuration has been saved",
      });
    }
    push(<Dependencies version={version || versions[0]} configuration={configuration} />);
  }

  useEffect(() => {
    fetchQuarkusVersions();
    loadSavedConfiguration();
  }, []);

  async function loadSavedConfiguration() {
    try {
      const saved = await LocalStorage.getItem<string>("preferredConfiguration");
      if (saved) {
        const config = JSON.parse(saved) as SavedConfiguration;
        setSavedConfig(config);
      }
    } catch (err) {
      console.error("Failed to load saved configuration:", err);
    }
  }

  if (isLoading) {
    return (
      <Form>
        <Form.Description text="🔄 Loading Quarkus versions from code.quarkus.io..." />
        <Form.Description text="Please wait while we fetch the latest versions." />
      </Form>
    );
  }

  if (error || !versions || versions.length === 0) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.RotateClockwise}
              onAction={() => {
                fetchQuarkusVersions();
              }}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      >
        <Form.Description text="❌ Failed to load Quarkus versions" />
        <Form.Description
          text={error || "Unable to connect to code.quarkus.io. Please check your internet connection and try again."}
        />
      </Form>
    );
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} onSubmit={handleSubmit} title="Add Dependencies" />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
        </ActionPanel>
      }
      navigationTitle={"Configure your new Quarkus project"}
    >
      <Form.Dropdown
        id="quarkusVersion"
        title="Quarkus version"
        onChange={handleVersionChange}
        defaultValue={savedConfig?.quarkusVersionKey}
      >
        {versions.map((v) => (
          <Form.Dropdown.Item key={v.key} value={v.key} title={v?.platformVersion + (v?.lts ? " [LTS]" : "")} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="buildTool" title="Build tool" defaultValue={savedConfig?.buildTool}>
        {BUILD_TOOLS.map((tool) => (
          <Form.Dropdown.Item key={tool.value} value={tool.value} title={tool.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.TextField id="group" title="Group" placeholder="org.acme" defaultValue={savedConfig?.group || "org.acme"} />
      <Form.TextField
        id="artifact"
        title="Artifact"
        placeholder="code.with.quarkus"
        defaultValue={savedConfig?.artifact || "code.with.quarkus"}
      />
      <Form.TextField
        id="version"
        title="Version"
        placeholder="1.0.0-SNAPSHOT"
        defaultValue={savedConfig?.version || "1.0.0-SNAPSHOT"}
      />
      <Form.Dropdown id="javaVersion" title="Java version" defaultValue={savedConfig?.javaVersion}>
        {JAVA_VERSIONS.map((javaVersion) => (
          <Form.Dropdown.Item key={javaVersion} value={javaVersion} title={javaVersion} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="starterCode"
        label="Include starter code"
        defaultValue={savedConfig?.starterCode !== undefined ? savedConfig.starterCode : true}
      />

      <Form.Separator />
      <Form.Checkbox
        id="saveAsPreferred"
        label="Save this configuration as preferred"
        value={saveAsPreferred}
        onChange={setSaveAsPreferred}
        info="When checked, this configuration will be saved and used as default values for future projects"
      />
    </Form>
  );
}
