import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getProjects } from "./projects-cache";
import {
  getMergedKeywords,
  saveProjectKeywords,
  deleteProjectKeywords,
} from "./custom-data";
import { GcpProject } from "./types";

export default function Command() {
  const [projects, setProjects] = useState<GcpProject[]>([]);
  const [existingKeywords, setExistingKeywords] = useState<
    Record<string, string[]>
  >({});
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const { pop } = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { projects } = await getProjects();
    const kw = await getMergedKeywords();
    setProjects(projects);
    setExistingKeywords(kw);
    if (projects.length > 0) {
      setSelectedProject(projects[0].projectId);
    }
  }

  useEffect(() => {
    if (selectedProject && existingKeywords[selectedProject]) {
      setKeywords(existingKeywords[selectedProject].join(", "));
    } else {
      setKeywords("");
    }
  }, [selectedProject, existingKeywords]);

  async function handleSubmit() {
    if (!selectedProject) {
      showToast({ style: Toast.Style.Failure, title: "Select a project" });
      return;
    }

    const keywordList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywordList.length === 0) {
      await deleteProjectKeywords(selectedProject);
      showToast({ style: Toast.Style.Success, title: "Keywords removed" });
    } else {
      await saveProjectKeywords(selectedProject, keywordList);
      showToast({
        style: Toast.Style.Success,
        title: `Keywords saved for ${selectedProject}`,
      });
    }
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Keywords" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="project"
        title="Project"
        value={selectedProject}
        onChange={setSelectedProject}
      >
        {projects.map((p) => (
          <Form.Dropdown.Item
            key={p.projectId}
            value={p.projectId}
            title={`${p.name} (${p.projectId})`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="keywords"
        title="Keywords"
        placeholder="dev, development, main"
        info="Comma-separated keywords for searching. Leave empty to remove."
        value={keywords}
        onChange={setKeywords}
      />
    </Form>
  );
}
