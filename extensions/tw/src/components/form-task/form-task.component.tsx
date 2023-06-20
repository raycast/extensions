import { useState, useRef } from "react";
import { Action, ActionPanel, Color, Form, Icon, useNavigation } from "@raycast/api";
import { SaveCommand, useProjects, useTags } from "../../hooks";
import { Priority, Task } from "../../core/types";
import { toDate } from "../../core/helpers";

type TaskProps = {
  onSave: SaveCommand;
  task?: Partial<Task>;
};

type FormProps = {
  description: string;
  project: string;
  priority?: Priority;
  due?: Date;
  tags: string | string[];
};

export default function NewTask({ onSave, task }: TaskProps) {
  const { pop } = useNavigation();
  const { tags, revalidateTags } = useTags();
  const { projects, revalidateProjects } = useProjects();

  const [descError, setDescError] = useState<string | undefined>();
  const dropDescErrorIfNeeded = () => {
    if (descError && descError.length > 0) {
      setDescError(undefined);
    }
  };

  const [projectNew, setProjectNew] = useState(false);
  const projTextRef = useRef<Form.TextField>(null);
  const toggleProjectInputMethod = () => {
    setProjectNew((prev) => {
      const next = !prev;
      if (next) {
        projTextRef.current?.focus();
      }
      return next;
    });
  };

  const [tagNew, setTagNew] = useState(false);
  const tagTextRef = useRef<Form.TextField>(null);
  const toggleTagInputMethod = () => {
    setTagNew((prev) => {
      const next = !prev;
      if (next) {
        tagTextRef.current?.focus();
      }
      return next;
    });
  };

  const isValid = (values: FormProps) => {
    if (values.description.length == 0) {
      if (!descError) setDescError("Required!");
      return false;
    } else {
      dropDescErrorIfNeeded();
    }
    return true;
  };
  const cleanUpTag = (tag: string) => tag.trim().replace(/^\+/, "");
  const getTags = (values: FormProps) =>
    typeof values.tags == "string"
      ? values.tags?.trim()?.split(" ")?.map(cleanUpTag) ?? []
      : values.tags?.map(cleanUpTag) ?? [];
  const revalidateAll = () => {
    revalidateTags();
    revalidateProjects();
  };

  const handleSubmit = (values: FormProps) => {
    if (isValid(values)) {
      return onSave({
        uuid: task?.uuid,
        description: values.description,
        project: values.project,
        priority: values?.priority,
        due: values.due?.toISOString() || undefined,
        tags: getTags(values),
      })
        .then(pop)
        .then(revalidateAll);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
          <Action
            title="Add New Project"
            icon={{
              source: Icon.Tray,
              tintColor: Color.Green,
            }}
            shortcut={{ modifiers: ["opt"], key: "p" }}
            onAction={toggleProjectInputMethod}
          />
          <Action
            title="Add New Tag"
            icon={{
              source: Icon.Tag,
              tintColor: Color.Orange,
            }}
            shortcut={{ modifiers: ["opt"], key: "t" }}
            onAction={toggleTagInputMethod}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Description"
        error={descError}
        onChange={dropDescErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDescError("Required!");
          } else {
            dropDescErrorIfNeeded();
          }
        }}
        defaultValue={task?.description}
      />

      <Form.Dropdown id="priority" title="Priority" defaultValue={task?.priority}>
        <Form.Dropdown.Item value="" title="No Priority" />
        {[
          ["L", "Low"],
          ["M", "Medium"],
          ["H", "High"],
        ].map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>

      {task?.project || !projects.length || projectNew ? (
        <Form.TextField
          id="project"
          title="New Project"
          ref={projTextRef}
          info={projects && "[⌥ P] to choose…"}
          placeholder="home, home & garden, home.kitchen"
          defaultValue={task?.project}
        />
      ) : (
        <Form.Dropdown id="project" title="Project" defaultValue="" info={projects && "[⌥ P] to add…"}>
          <Form.Dropdown.Item value="" title="No Project" />
          {projects.map((value) => (
            <Form.Dropdown.Item
              icon={{ source: Icon.Tray, tintColor: Color.Green }}
              key={`form_project_${value}`}
              value={value}
              title={`@${value}`}
            />
          ))}
          <Form.Dropdown.Item
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
            key="form_project_new"
            value="project:new"
            title="Add New Project…"
          />
        </Form.Dropdown>
      )}

      {!tags.length || tagNew ? (
        <Form.TextField
          id="tags"
          title="New Tag"
          ref={tagTextRef}
          info={tags ? "[⌥ T] to choose…" : 'Space separated, e.g. "raycast taskwarrior"'}
          placeholder="raycast, taskwarrior"
        />
      ) : (
        <Form.TagPicker
          id="tags"
          title="Tags"
          info={task?.tags ? task?.tags.join(", ") : 'Space separated, e.g. "raycast taskwarrior"'}
          defaultValue={task?.tags}
        >
          {tags.map((value) => (
            <Form.TagPicker.Item key={`form_tag_${value}`} value={value} title={`+${value}`} />
          ))}
        </Form.TagPicker>
      )}

      <Form.DatePicker id="due" title="Due Date" defaultValue={task?.due ? toDate(task?.due) : undefined} />
    </Form>
  );
}
