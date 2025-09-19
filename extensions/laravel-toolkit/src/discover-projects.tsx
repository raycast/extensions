import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, List, Icon, Detail } from "@raycast/api";
import { scanForLaravelProjects, DiscoveredProject } from "../lib/projectScanner";
import { addProject, getProjects } from "../lib/projectStore";

interface FormValues {
  folder: string[];
}

export default function DiscoverProjects() {
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredProjects, setDiscoveredProjects] = useState<DiscoveredProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState(new Set<string>());
  const [scanCompleted, setScanCompleted] = useState(false);

  async function handleScan(values: FormValues) {
    if (!values.folder || values.folder.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Folder Required",
        message: "Please select a folder to scan",
      });
      return;
    }

    setIsScanning(true);
    setDiscoveredProjects([]);
    setSelectedProjects(new Set());
    setScanCompleted(false);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Scanning for Laravel projects...",
      });

      const folderPath = values.folder[0];
      const projects = await scanForLaravelProjects(folderPath, 3);

      // Filter out projects that already exist
      const existingProjects = await getProjects();
      const existingPaths = new Set(Object.values(existingProjects));
      const newProjects = projects.filter((project) => !existingPaths.has(project.path));

      setDiscoveredProjects(newProjects);
      setScanCompleted(true);

      if (newProjects.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "Scan Complete",
          message: "No new Laravel projects found",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Scan Complete",
          message: `Found ${newProjects.length} new Laravel project${newProjects.length === 1 ? "" : "s"}`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Scan Failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsScanning(false);
    }
  }

  async function handleAddSelected() {
    if (selectedProjects.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Projects Selected",
        message: "Please select at least one project to add",
      });
      return;
    }

    try {
      const projectsToAdd = discoveredProjects.filter((project) => selectedProjects.has(project.path));

      for (const project of projectsToAdd) {
        await addProject(project.name, project.path);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Projects Added",
        message: `Added ${projectsToAdd.length} project${projectsToAdd.length === 1 ? "" : "s"}`,
      });

      // Reset state
      setDiscoveredProjects([]);
      setSelectedProjects(new Set());
      setScanCompleted(false);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Projects",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  function toggleProjectSelection(projectPath: string) {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectPath)) {
      newSelected.delete(projectPath);
    } else {
      newSelected.add(projectPath);
    }
    setSelectedProjects(newSelected);
  }

  // Show discovered projects list
  if (scanCompleted && discoveredProjects.length > 0) {
    return (
      <List
        searchBarPlaceholder="Filter discovered projects..."
        actions={
          <ActionPanel>
            <Action
              title={`Add ${selectedProjects.size} Selected Project${selectedProjects.size === 1 ? "" : "s"}`}
              icon={Icon.Plus}
              onAction={handleAddSelected}
            />
            <Action
              title="Scan Another Folder"
              icon={Icon.MagnifyingGlass}
              onAction={() => {
                setDiscoveredProjects([]);
                setSelectedProjects(new Set());
                setScanCompleted(false);
              }}
            />
          </ActionPanel>
        }
      >
        {discoveredProjects.map((project) => (
          <List.Item
            key={project.path}
            title={project.name}
            subtitle={project.path}
            icon={selectedProjects.has(project.path) ? Icon.CheckCircle : Icon.Circle}
            accessories={selectedProjects.has(project.path) ? [{ text: "Selected" }] : undefined}
            actions={
              <ActionPanel>
                <Action
                  title={selectedProjects.has(project.path) ? "Deselect Project" : "Select Project"}
                  icon={selectedProjects.has(project.path) ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggleProjectSelection(project.path)}
                />
                <Action
                  title={`Add ${selectedProjects.size} Selected Project${selectedProjects.size === 1 ? "" : "s"}`}
                  icon={Icon.Plus}
                  onAction={handleAddSelected}
                />
                <Action
                  title="Scan Another Folder"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    setDiscoveredProjects([]);
                    setSelectedProjects(new Set());
                    setScanCompleted(false);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Show no results message
  if (scanCompleted && discoveredProjects.length === 0) {
    return (
      <Detail
        markdown="## No New Laravel Projects Found\n\nNo new Laravel projects were discovered in the selected folder. All found projects may already be in your project list."
        actions={
          <ActionPanel>
            <Action
              title="Scan Another Folder"
              icon={Icon.MagnifyingGlass}
              onAction={() => {
                setDiscoveredProjects([]);
                setSelectedProjects(new Set());
                setScanCompleted(false);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Show folder selection form
  return (
    <Form
      isLoading={isScanning}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Scan for Projects" icon={Icon.MagnifyingGlass} onSubmit={handleScan} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Select Folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        info="Choose a folder to scan for Laravel projects (scans up to 3 levels deep)"
      />
      <Form.Description text="This will scan the selected folder and its subdirectories (up to 3 levels deep) to discover Laravel projects. Projects are identified by the presence of an 'artisan' file and Laravel-specific directory structure." />
    </Form>
  );
}
