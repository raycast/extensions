import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { createNote, fetchProjects, fetchTags } from "./lib/api";

export default function Command() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useCachedPromise(fetchProjects);
  const { data: tags = [], isLoading: tagsLoading } = useCachedPromise(fetchTags);

  async function handleSubmit() {
    if (!title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedTagNames = selectedTags
        .map((uid) => tags.find((t) => t.uid === uid)?.name)
        .filter((name): name is string => Boolean(name));
      const selectedProjectObj = projects.find((p) => p.id.toString() === selectedProject);

      await createNote({
        title: title.trim(),
        content,
        ...(selectedProjectObj ? { project_uid: selectedProjectObj.uid } : {}),
        ...(selectedTagNames.length > 0 ? { tags: selectedTagNames } : {}),
      });

      showToast({ style: Toast.Style.Success, title: "Note created successfully" });
      setTitle("");
      setContent("");
      setSelectedProject("");
      setSelectedTags([]);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create note",
        message: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={projectsLoading || tagsLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} />
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
