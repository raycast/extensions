import { Form, ActionPanel, Action, showToast, getPreferenceValues, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

interface Project {
  id: number;
  uid: string;
  name: string;
}

interface Tag {
  uid: string;
  name: string;
}

export default function Command() {
  const preferences = getPreferenceValues<{ apiUrl: string; email: string; password: string }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Login to get session cookie
        const loginRes = await fetch(`${preferences.apiUrl}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: preferences.email, password: preferences.password }),
        });
        if (!loginRes.ok) {
          throw new Error("Login failed");
        }
        const cookie = loginRes.headers.get("set-cookie");

        // Fetch projects
        const projectsRes = await fetch(`${preferences.apiUrl}/api/projects`, {
          headers: cookie ? { Cookie: cookie } : undefined,
        });
        if (projectsRes.ok) {
          const projectsData = (await projectsRes.json()) as { projects: Project[] };
          setProjects(projectsData.projects.filter((p: Project) => p && p.id != null && p.name));
        }

        // Fetch tags
        const tagsRes = await fetch(`${preferences.apiUrl}/api/tags`, {
          headers: cookie ? { Cookie: cookie } : undefined,
        });
        if (tagsRes.ok) {
          const tagsData = (await tagsRes.json()) as Tag[];
          setTags(tagsData.filter((t: Tag) => t && t.uid != null && t.name));
        }
      } catch (error) {
        console.error("Failed to load projects/tags:", error);
      }
    }

    loadData();
  }, [preferences.apiUrl, preferences.email, preferences.password]);

  async function handleSubmit() {
    try {
      // Always login to get session cookie
      const loginRes = await fetch(`${preferences.apiUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: preferences.email, password: preferences.password }),
      });
      if (!loginRes.ok) {
        throw new Error("Login failed");
      }
      const cookie = loginRes.headers.get("set-cookie");

      // Create note
      const selectedTagObjects = selectedTags.map((uid) => tags.find((t) => t.uid === uid)).filter(Boolean);
      const selectedProjectObj = projects.find((p) => p.id.toString() === selectedProject);
      const body = {
        title,
        content,
        ...(selectedProjectObj ? { project_uid: selectedProjectObj.uid } : {}),
        ...(selectedTagObjects.length > 0
          ? { tags: selectedTagObjects.filter((t) => t !== undefined).map((t) => t.name) }
          : {}),
      };
      console.log("Create note body:", body);
      const response = await fetch(`${preferences.apiUrl}/api/note`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      });
      console.log("Create note response:", response.status, response.statusText);

      if (response.ok) {
        showToast({ title: "Note created successfully", style: Toast.Style.Success });
        // Reset form
        setTitle("");
        setContent("");
        setSelectedProject("");
        setSelectedTags([]);
      } else {
        showToast({ title: "Failed to create note", message: response.statusText, style: Toast.Style.Failure });
      }
    } catch (error) {
      showToast({ title: "Error", message: (error as Error).message, style: Toast.Style.Failure });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new Tududi note." />
      <Form.TextField id="title" title="Title" placeholder="Enter note title" value={title} onChange={setTitle} />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter note content"
        value={content}
        onChange={setContent}
      />
      <Form.Dropdown id="project" title="Project" value={selectedProject} onChange={setSelectedProject}>
        <Form.Dropdown.Item value="" title="No Project" />
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id.toString()} title={project.name} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="Tags" value={selectedTags} onChange={setSelectedTags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.uid} value={tag.uid} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
