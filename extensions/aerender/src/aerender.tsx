import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { existsSync } from "node:fs";
import { detectAfterEffectsVersions, AEVersion, getRandomRenderMessage } from "./utils/ae-detector";
import RenderProgress from "./render-progress";

export default function Command() {
  const { push } = useNavigation();
  const [aeVersions, setAeVersions] = useState<AEVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [projectPath, setProjectPath] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Detect AE versions
        const versions = detectAfterEffectsVersions();
        setAeVersions(versions);

        if (versions.length > 0) {
          setSelectedVersion(versions[0].aerenderPath);
        }
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Detect After Effects",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleSubmit(values: { version: string; project: string[] }) {
    const selectedProject = Array.isArray(values.project) ? values.project[0] : values.project;

    if (!selectedProject || !values.version) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Information",
        message: "Please select AE version and project file",
      });
      return;
    }

    if (!existsSync(selectedProject)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "File Not Found",
        message: `Cannot find: ${selectedProject}`,
      });
      return;
    }

    if (!selectedProject.endsWith(".aep") && !selectedProject.endsWith(".aepx")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid File Type",
        message: "Please select an After Effects project (.aep or .aepx)",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: getRandomRenderMessage(),
    });

    push(<RenderProgress aerenderPath={values.version} projectPath={selectedProject} />);
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  if (aeVersions.length === 0) {
    return (
      <Form>
        <Form.Description
          title="Welcome to After Effects Render"
          text="Looks like After Effects isn't installed yet. Install Adobe After Effects and restart this extension to get started with lightning-fast rendering!"
        />
        <Form.Separator />
        <Form.Description
          title="What You'll Be Able to Do"
          text="• Render projects directly from Raycast\n• Track render progress in real-time\n• View render history and statistics\n• Quick access to recent projects"
        />
      </Form>
    );
  }

  return (
    <Form
      navigationTitle="Start Render"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Rendering" icon={Icon.Play} onSubmit={handleSubmit} />
          {projectPath && (
            <>
              <Action.ShowInFinder
                title="Show Project in Finder"
                path={projectPath}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <Action.CopyToClipboard
                title="Copy Project Path"
                content={projectPath}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="version"
        title="After Effects Version"
        info="Choose which version of After Effects to use for rendering"
        value={selectedVersion}
        onChange={setSelectedVersion}
      >
        {aeVersions.map((version) => (
          <Form.Dropdown.Item key={version.aerenderPath} value={version.aerenderPath} title={version.name} />
        ))}
      </Form.Dropdown>

      <Form.FilePicker
        id="project"
        title="Project File"
        info="Select an After Effects project file (.aep or .aepx)"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={projectPath ? [projectPath] : []}
        onChange={(files) => {
          const file = files[0];
          if (file) {
            setProjectPath(file);
          }
        }}
      />

      {projectPath && <Form.Description title="Selected File" text={projectPath.split("/").pop() || projectPath} />}

      <Form.Description
        title="Before You Start"
        text={`Make sure you've:
• Queued your compositions in After Effects
• Set output paths for each item
• Saved your project file

Ready? Hit Start Rendering below!`}
      />
    </Form>
  );
}
