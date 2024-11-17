import {Form, ActionPanel, Action, showToast, Toast} from "@raycast/api";
import {useEffect, useState} from "react";
import fetch from "node-fetch";
import path from "path";
import {writeFileSync} from "fs";

type Values = {
  quarkusVersion:string;
  group:string;
  artifact:string;
  buildTool:string;
  javaVersion:string;
  starterCode:boolean;
  dependencies:string[];
};

export interface Dependency {
  id: string
  shortId: string
  version: string
  name: string
  description: string
  shortName: string
  category: string
  transitiveExtensions: string[]
  tags: string[]
  keywords: string[]
  providesExampleCode: boolean
  providesCode: boolean
  guide: string
  order: number
  platform: boolean
  bom: string
}

export interface QuarkusVersion {
  key: string
  quarkusCoreVersion: string
  javaCompatibility: JavaCompatibility
  platformVersion: string
  recommended: boolean
  status: string
  lts: boolean
}

export interface JavaCompatibility {
  versions: number[]
  recommended: number
}


export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [depedencies, setDepedencies] = useState<Dependency[]>([]);
  const [quarkusVersions, setQuarkusVersions] = useState<QuarkusVersion[]>([]);
  const [recommendedVersion, setRecommendedVersion] = useState<QuarkusVersion|null>(null);

  async function fetchQuarkusVersions() {
    const response = await fetch("https://code.quarkus.io/api/streams", {});
    if (!response.ok) {
      throw new Error(`Failed to fetch quarkus version: ${response.status} ${response.statusText}`);
    }
    const versions = await response.json() as QuarkusVersion[];
    setQuarkusVersions(versions);
    setRecommendedVersion(versions.filter(v => v.recommended)[0] || null);
  }

  async function fetchDependencies() {
    try {
      setIsLoading(true);
      console.log("Fetching metadata...");
      //const response = {ok:false, status:'', statusText:'',json: () => Promise.resolve([])};
      const response = await fetch("https://code.quarkus.io/api/extensions/stream/io.quarkus.platform:3.16?platformOnly=false", {});

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch Quarkus dependencies: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as Dependency[];
      console.log("Metadata received successfully");

      setDepedencies(data);
      setIsLoading(false);

      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Metadata loaded successfully"
      });
    } catch (error) {
      console.error("Error fetching metadata:", error);
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load metadata",
      });
    }
  }

  function generateQuarkusUrl(config: Values): string {
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
    //if (config.version) params.set("v", config.version);

    // Add starter code flag
    if (!config.starterCode) params.set("nc", "true");

    // Add dependencies
    config.dependencies.forEach((dependency) => {
      params.append("e", dependency);
    });

    // Return the generated URL
    return `${baseUrl}?${params.toString()}`;
  }

  useEffect(() => {
    fetchQuarkusVersions().then(() => fetchDependencies())

  }, []);


  async function handleSubmit(values: Values) {

    try {
      console.log("Submitting form with values:", values);
      const url = generateQuarkusUrl(values);
      //https://code.quarkus.io/d?b=GRADLE_KOTLIN_DSL&j=17&e=rest&e=io.quarkiverse.langchain4j%3Aquarkus-langchain4j-ollama&cn=code.quarkus.io
      showToast({ title: "Submitted form", message: "See logs for submitted values" });

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
      const downloadsPath = path.join(homeDir || "", 'Downloads', `${values.artifact}.zip`);

      writeFileSync(downloadsPath, buffer);

      await showToast({
        style: Toast.Style.Success,
        title: "Project Downloaded",
        message: `Saved to Downloads folder as ${values.artifact}.zip`,
      });

    } catch (error) {
      console.error("Error generating project:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to generate project",
      });
    }
  }


  if (isLoading) {
    return (
        <Form>
          <Form.Description text="Loading Code.Quarkus metadata... Please wait." />
        </Form>
    );
  }

  if (!depedencies) {
    return (
        <Form>
          <Form.Description text="Failed to load dependencies. Please try again." />
          <ActionPanel>
            <Action
                title="Retry"
                onAction={() => {
                  setIsLoading(true);
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
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new Quarkus project" />
      <Form.Description title="Quarkus version" text={recommendedVersion?.platformVersion + (recommendedVersion?.lts? " [LTS":"")} />
      <Form.Dropdown id="buildTool" title="Build tool">
        <Form.Dropdown.Item value="MAVEN" title="Maven" />
        <Form.Dropdown.Item value="GRADLE" title="Gradle" />
        <Form.Dropdown.Item value="GRADLE_KOTLIN_DSL" title="Gradle with Kotlin DSL" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="group" title="Group" placeholder="org.acme" defaultValue="org.acme" />
      <Form.TextField id="artifact" title="Artifact" placeholder="code.with.quarkus" defaultValue="code.with.quarkus" />
      <Form.Dropdown id="javaVersion" title="Java version">
        <Form.Dropdown.Item value="21" title="21" />
        <Form.Dropdown.Item value="17" title="17" />
      </Form.Dropdown>
      <Form.Checkbox id="starterCode" label="Include starter code" storeValue />
      <Form.Separator />
      <Form.TagPicker id="dependencies" title="Dependencies">
        {depedencies.map( dep => (
            <Form.TagPicker.Item key={dep.id+":" + dep.order} value={dep.id} title={dep.name+" ["+dep.id.split(":")[1]+"]"} />
        ))}
      </Form.TagPicker>
    </Form>

  );
}
