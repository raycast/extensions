import {
  Action,
  confirmAlert,
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
import { useRef, useState } from "react";
import { describeNoteSteps, normalizeTag, NoteStep, noteAppUrl, Tag, TAG_PATTERN } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { AmplenoteTimeoutError } from "../lib/mcp";

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

  // Set once the note is saved but a later step failed. The form then only retries those steps.
  const [pending, setPending] = useState<{ noteUUID: string; name: string; steps: NoteStep[] }>();
  // One submit at a time: a second ⌘↵ while saving must not create a second note or add content twice.
  const busy = useRef(false);
  const maybeCreated = useRef(false);
  const [saving, setSaving] = useState(false);

  const finish = async (noteUUID: string, name: string, steps: NoteStep[], values: Values) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: pending ? "Retrying…" : "Saving note…" });
    const failed = await amplenote.applyNoteSteps(noteUUID, steps);
    if (failed.length > 0) {
      setPending({ noteUUID, name, steps: failed });
      toast.style = Toast.Style.Failure;
      toast.title = `Created "${name}", but could not ${describeNoteSteps(failed)}`;
      toast.message = "Press ⌘↵ to retry only that step.";
      toast.primaryAction = { title: "Open in Amplenote", onAction: () => void open(noteAppUrl(noteUUID)) };
      return;
    }
    setPending(undefined);
    // Refresh again now that the remaining steps (e.g. joining a task domain) are done.
    if (steps.length > 0) props.onCreated?.();
    if (props.closeOnSubmit || values.openAfterCreate) {
      toast.hide();
      if (values.openAfterCreate) await open(noteAppUrl(noteUUID));
      // Must be the last step: popping to root ends the command.
      await showHUD(`Created "${name}"`, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    } else {
      toast.style = Toast.Style.Success;
      toast.title = `Created "${name}"`;
      toast.primaryAction = { title: "Open in Amplenote", onAction: () => void open(noteAppUrl(noteUUID)) };
      await popToRoot();
    }
  };

  const save = async (values: Values) => {
    if (pending) {
      await finish(pending.noteUUID, pending.name, pending.steps, values);
      return;
    }
    const name = values.name.trim();
    if (!name) {
      setNameError("Enter a title");
      return;
    }
    if (maybeCreated.current) {
      const again = await confirmAlert({
        title: "Create the note again?",
        message: "The last attempt timed out, so Amplenote may have created the note already.",
        primaryAction: { title: "Create Again" },
      });
      if (!again) return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating note…" });
    let noteUUID: string;
    try {
      noteUUID = await amplenote.createNote(name, selectedTags);
    } catch (error) {
      toast.hide();
      // A timed-out create may still land in Amplenote, so warn instead of inviting a blind retry.
      // Only a successful create clears this: a later, different failure doesn't undo the earlier timeout.
      if (error instanceof AmplenoteTimeoutError) maybeCreated.current = true;
      await showFailureToast(error, {
        title: "Could not create note",
        message:
          error instanceof AmplenoteTimeoutError
            ? "Amplenote didn't respond in time. The note may have been created anyway; check Amplenote before trying again."
            : undefined,
      });
      return;
    }
    maybeCreated.current = false;
    // The note exists now: refresh lists right away, even if a later step fails.
    props.onCreated?.();
    const steps: NoteStep[] = [
      ...(values.content.trim() ? [{ kind: "content" as const, markdown: values.content }] : []),
      ...(values.taskDomain && values.taskDomain !== NO_DOMAIN
        ? [{ kind: "taskDomain" as const, taskDomainUUID: values.taskDomain }]
        : []),
    ];
    await finish(noteUUID, name, steps, values);
  };

  const submit = async (values: Values) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await save(values);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <Form
      navigationTitle="Create Note"
      isLoading={tags.isLoading || saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={pending ? "Retry" : "Create Note"}
            icon={pending ? Icon.ArrowClockwise : Icon.NewDocument}
            onSubmit={submit}
          />
          <Action.Push
            title="Create New Tag"
            icon={Icon.Tag}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<NewTagForm existing={[...existingTags, ...newTags]} onCreate={addTag} />}
          />
        </ActionPanel>
      }
    >
      {pending ? (
        <Form.Description
          title="Note Created"
          text={`"${pending.name}" was created, but the extension could not ${describeNoteSteps(pending.steps)}. Press ⌘↵ to retry only that step. Other changes in this form are not applied anymore.`}
        />
      ) : null}
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
      {domains.data ? (
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
      ) : null}
      <Form.TextArea id="content" title="Content" placeholder="Write in Markdown" enableMarkdown />
      <Form.Checkbox id="openAfterCreate" label="Open in Amplenote after creating" storeValue />
    </Form>
  );
}
