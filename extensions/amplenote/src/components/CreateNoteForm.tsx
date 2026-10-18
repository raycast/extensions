import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Keyboard,
  open,
  popToRoot,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { normalizeTag, noteAppUrl, Tag, TAG_PATTERN } from "../lib/api";
import { amplenote } from "../lib/amplenote";

const NO_DOMAIN = "none";

type Values = {
  name: string;
  tags: string[];
  content: string;
  openAfterCreate: boolean;
  taskDomain: string;
};

function NewTagForm(props: { existing: string[]; onCreate: (tag: string) => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();

  const submit = ({ tag }: { tag: string }) => {
    const normalized = normalizeTag(tag);
    if (!TAG_PATTERN.test(normalized)) {
      setError("Use lowercase letters, numbers, and dashes, with / to nest a tag");
      return;
    }
    props.onCreate(normalized);
    pop();
  };

  return (
    <Form
      navigationTitle="Create New Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Tag" icon={Icon.Tag} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tag"
        title="Tag"
        placeholder="project-x or area/work"
        info="Lowercase letters, numbers, and dashes. Use / to nest a tag under another."
        error={error}
        onChange={(value) =>
          setError(props.existing.includes(normalizeTag(value)) ? "This tag already exists" : undefined)
        }
        autoFocus
      />
    </Form>
  );
}

export default function CreateNoteForm(props: {
  name?: string;
  tags?: Tag[];
  onCreated?: () => void;
  closeOnSubmit?: boolean;
}) {
  const loadedTags = usePromise(amplenote.getTags, [], { execute: !props.tags });
  const domains = usePromise(amplenote.getTaskDomains);
  const tags = props.tags ? { data: props.tags, isLoading: false } : loadedTags;
  const [nameError, setNameError] = useState<string>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);
  const existingTags = (tags.data ?? []).map((tag) => tag.text);

  const addTag = (tag: string) => {
    if (!existingTags.includes(tag)) setNewTags((previous) => [...new Set([...previous, tag])]);
    setSelectedTags((previous) => [...new Set([...previous, tag])]);
  };

  const submit = async (values: Values) => {
    const name = values.name.trim();
    if (!name) {
      setNameError("Enter a title");
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating note…" });
    try {
      const noteUUID = await amplenote.createNote(name, selectedTags);
      // The note exists from here on, so later steps report failures instead of aborting (a retry would duplicate it).
      const failed: string[] = [];
      if (values.content.trim()) {
        await amplenote.insertNoteContent(noteUUID, values.content).catch(() => failed.push("add its content"));
      }
      if (values.taskDomain && values.taskDomain !== NO_DOMAIN) {
        await amplenote
          .addNoteToTaskDomain(noteUUID, values.taskDomain)
          .catch(() => failed.push("add it to the task domain"));
      }
      const contentFailed = failed.length > 0;
      const message = contentFailed ? `Created "${name}", but could not ${failed.join(" or ")}` : `Created "${name}"`;
      props.onCreated?.();
      if (props.closeOnSubmit || values.openAfterCreate) {
        toast.hide();
        if (values.openAfterCreate) await open(noteAppUrl(noteUUID));
        // Must be the last step: popping to root ends the command.
        await showHUD(message, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      } else {
        toast.style = contentFailed ? Toast.Style.Failure : Toast.Style.Success;
        toast.title = message;
        toast.primaryAction = { title: "Open in Amplenote", onAction: () => void open(noteAppUrl(noteUUID)) };
        await popToRoot();
      }
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Could not create note" });
    }
  };

  return (
    <Form
      navigationTitle="Create Note"
      isLoading={tags.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" icon={Icon.NewDocument} onSubmit={submit} />
          <Action.Push
            title="Create New Tag"
            icon={Icon.Tag}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<NewTagForm existing={[...existingTags, ...newTags]} onCreate={addTag} />}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Title"
        placeholder="Note title"
        defaultValue={props.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        autoFocus
      />
      <Form.TagPicker
        id="tags"
        title="Tags"
        placeholder="Add tags"
        value={selectedTags}
        onChange={setSelectedTags}
        info="Press ⌘N to create a new tag."
      >
        {newTags.map((tag) => (
          <Form.TagPicker.Item key={`new-${tag}`} value={tag} title={`${tag} (new)`} icon={Icon.PlusCircle} />
        ))}
        {(tags.data ?? []).map((tag) => (
          <Form.TagPicker.Item
            key={tag.text}
            value={tag.text}
            title={tag.text}
            icon={{ source: Icon.Tag, tintColor: tag.color ? `#${tag.color}` : undefined }}
          />
        ))}
      </Form.TagPicker>
      <Form.Dropdown
        id="taskDomain"
        title="Task Domain"
        storeValue
        defaultValue={NO_DOMAIN}
        info="Add the note to a task domain so its tasks show in Search Tasks."
      >
        <Form.Dropdown.Item title="None" value={NO_DOMAIN} icon={Icon.MinusCircle} />
        {(domains.data ?? []).map((domain) => (
          <Form.Dropdown.Item key={domain.uuid} title={domain.name} value={domain.uuid} icon={Icon.Layers} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="content" title="Content" placeholder="Write in Markdown" enableMarkdown />
      <Form.Checkbox id="openAfterCreate" label="Open in Amplenote after creating" storeValue />
    </Form>
  );
}
