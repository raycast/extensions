import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot, open } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { writeFileSync } from "fs";
import path from "path";

interface DependencyValue {
  id: string;
  name: string;
  description: string;
}

interface DependencyGroup {
  name: string;
  values: DependencyValue[];
}

interface ValueType {
  id: string;
  name: string;
}

interface InitializrMetadata {
  dependencies: {
    values: DependencyGroup[];
  };
  type: {
    default: string;
    values: ValueType[];
  };
  javaVersion: {
    default: string;
    values: ValueType[];
  };
  bootVersion: {
    default: string;
    values: ValueType[];
  };
  language: {
    default: string;
    values: ValueType[];
  };
  packaging: {
    default: string;
    values: ValueType[];
  };
}

type Values = {
  type: string;
  language: string;
  bootVersion: string;
  groupId: string;
  artifactId: string;
  name: string;
  description: string;
  packageName: string;
  packaging: string;
  javaVersion: string;
  dependencies: string[];
};

interface Preferences {
  outputDirectory: string;
  popToRootAfterGenerate: boolean;
  openOutputDirectory: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [metadata, setMetadata] = useState<InitializrMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        console.log("Fetching metadata...");
        const response = await fetch("https://start.spring.io", {
          headers: {
            Accept: "application/vnd.initializr.v2.2+json",
            "User-Agent": "Raycast-Spring-Initializr",
          },
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          throw new Error(`Failed to fetch Spring Initializr metadata: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as InitializrMetadata;
        console.log("Metadata received successfully");

        setMetadata(data);
        setIsLoading(false);

        showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Metadata loaded successfully",
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

    fetchMetadata();
  }, []);

  async function handleSubmit(values: Values) {
    try {
      console.log("Submitting form with values:", values);
      const params = new URLSearchParams({
        type: values.type,
        language: values.language,
        bootVersion: values.bootVersion,
        groupId: values.groupId,
        artifactId: values.artifactId,
        name: values.name,
        description: values.description,
        packageName: values.packageName,
        packaging: values.packaging,
        javaVersion: values.javaVersion,
        dependencies: values.dependencies.join(","),
      });

      // Show generating toast
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating project...",
      });

      const response = await fetch(`https://start.spring.io/starter.zip?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to generate project: ${response.statusText}`);
      }

      // Convert the response to a buffer
      const buffer = await response.buffer();

      // Use the user-specified directory, fallback to HOME if "~" is used
      const outputDir = preferences.outputDirectory.replace("~", process.env.HOME || "");
      const outputPath = path.join(outputDir, `${values.artifactId}.zip`);

      writeFileSync(outputPath, buffer);

      await showToast({
        style: Toast.Style.Success,
        title: "Project Downloaded",
        message: `Saved to ${outputPath}`,
      });

      // If user wants to open the directory after generation
      if (preferences.openOutputDirectory) {
        const directoryToOpen = path.dirname(outputPath);
        await open(directoryToOpen);
      }

      // If user wants to pop to root after generation
      if (preferences.popToRootAfterGenerate) {
        await popToRoot();
      }
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
        <Form.Description text="Loading Spring Initializr metadata... Please wait." />
      </Form>
    );
  }

  if (!metadata) {
    return (
      <Form>
        <Form.Description text="Failed to load metadata. Please try again." />
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
          <Action.SubmitForm title="Generate Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new Spring Boot project" />

      <Form.Dropdown id="type" title="Project Type" defaultValue={metadata.type.default}>
        {metadata.type.values.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="language" title="Language" defaultValue={metadata.language.default}>
        {metadata.language.values.map((lang) => (
          <Form.Dropdown.Item key={lang.id} value={lang.id} title={lang.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="bootVersion" title="Spring Boot Version" defaultValue={metadata.bootVersion.default}>
        {metadata.bootVersion.values.map((version) => (
          <Form.Dropdown.Item key={version.id} value={version.id} title={version.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField id="groupId" title="Group ID" placeholder="com.example" defaultValue="com.example" />
      <Form.TextField id="artifactId" title="Artifact ID" placeholder="demo" defaultValue="demo" />
      <Form.TextField id="name" title="Name" placeholder="demo" defaultValue="demo" />
      <Form.TextField id="description" title="Description" placeholder="Demo project for Spring Boot" />
      <Form.TextField
        id="packageName"
        title="Package Name"
        placeholder="com.example.demo"
        defaultValue="com.example.demo"
      />

      <Form.Separator />

      <Form.Dropdown id="packaging" title="Packaging" defaultValue={metadata.packaging.default}>
        {metadata.packaging.values.map((pack) => (
          <Form.Dropdown.Item key={pack.id} value={pack.id} title={pack.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="javaVersion" title="Java Version" defaultValue={metadata.javaVersion.default}>
        {metadata.javaVersion.values.map((version) => (
          <Form.Dropdown.Item key={version.id} value={version.id} title={version.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TagPicker id="dependencies" title="Dependencies">
        {metadata.dependencies.values.flatMap((group) =>
          group.values.map((dep) => (
            <Form.TagPicker.Item key={dep.id} value={dep.id} title={`${group.name}: ${dep.name}`} />
          )),
        )}
      </Form.TagPicker>
    </Form>
  );
}
