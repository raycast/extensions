import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { basename } from "path";
import { addProject, setActiveProject } from "../lib/projectStore";
import { validateLaravelProjectPath, sanitizeProjectName } from "../lib/pathValidator";

export default function Command() {
  const [path, setPath] = useState<string | undefined>();
  const [customName, setCustomName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Add Project"
            onAction={async () => {
              if (!path) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Path Required",
                  message: "Please select a Laravel project folder.",
                });
                return;
              }

              setIsLoading(true);

              try {
                // Validate and sanitize the path
                const pathValidation = validateLaravelProjectPath(path);
                if (!pathValidation.isValid) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Invalid Project Path",
                    message: pathValidation.error || "Selected path is not valid.",
                  });
                  return;
                }

                const sanitizedPath = pathValidation.sanitizedPath!;

                // Determine project name
                const proposedName = customName.trim() || basename(sanitizedPath);

                // Validate and sanitize the project name
                const nameValidation = sanitizeProjectName(proposedName);
                if (!nameValidation.isValid) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Invalid Project Name",
                    message: nameValidation.error || "Project name is not valid.",
                  });
                  return;
                }

                const sanitizedName = nameValidation.sanitizedPath!;

                // Add the project
                await addProject(sanitizedName, sanitizedPath);
                await setActiveProject(sanitizedPath);

                await showToast({
                  style: Toast.Style.Success,
                  title: `Added "${sanitizedName}" and set as active project`,
                });

                popToRoot();
              } catch (error) {
                console.error("Failed to add project:", error);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to Add Project",
                  message: error instanceof Error ? error.message : "Unknown error occurred",
                });
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="project-folder"
        title="Select Laravel Project Folder"
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories={true}
        onChange={(value) => setPath(value?.[0])}
      />
      <Form.TextField
        id="project-name"
        title="Project Name (Optional)"
        placeholder="Leave empty to use folder name"
        value={customName}
        onChange={setCustomName}
        info="Custom name for this project. If empty, the folder name will be used."
      />
    </Form>
  );
}
