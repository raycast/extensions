import {
  Action,
  ActionPanel,
  Form,
  getSelectedFinderItems,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getProjects, saveProjects } from "./storage";
import { ProjectItem } from "./types";
import { useEffect, useState } from "react";
import path from "path";
import { getSelectedFinderWindow } from "./common/util";

export default function Main() {
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [isError, setError] = useState<boolean>(false);
  const { pop } = useNavigation();

  async function getSelectedPath() {
    try {
      const selectedFinderItems = await getSelectedFinderItems();
      if (selectedFinderItems.length) {
        for (const finderItem of selectedFinderItems) {
          setSelectedPath(finderItem.path);
          return;
        }
      }
      const selectedFinderWindow = await getSelectedFinderWindow();
      setSelectedPath(selectedFinderWindow);
      return;
    } catch (error: any) {
      setError(true);
      await showToast({
        style: Toast.Style.Failure,
        title: "No Finder items or window selected",
      });
    }
  }

  useEffect(() => {
    (async () => {
      await getSelectedPath();
    })();
  }, []);

  async function saveProject(project: ProjectItem) {
    const existingProjects = await getProjects();
    if (project.name.length === 0 || project.path.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error validating inputs",
      });
      return;
    }
    if (existingProjects.filter((item) => item.path === project.path).length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project already saved.",
      });
      return;
    }
    existingProjects.push(project);

    await saveProjects(existingProjects);
    await showHUD("Project saved ✅");

    pop();
  }

  return (
    <Form
      isLoading={selectedPath.length <= 0 && !isError}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={(values: ProjectItem) => saveProject(values)} />
        </ActionPanel>
      }
    >
      {selectedPath.length > 0 && (
        <>
          <Form.TextField id="name" title="Name" defaultValue={path.basename(selectedPath)} />
          <Form.TextField id="path" title="Path" defaultValue={selectedPath} />
        </>
      )}
    </Form>
  );
}
