import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { upsertTarget, Target } from "./foxhop";

type Props = {
  target?: Target;
  prefill?: Pick<Target, "title" | "url"> & Partial<Pick<Target, "match">>;
  onSave: () => void;
};

type FormValues = {
  url: string;
  title: string;
  match: string;
  strategy: string;
  pick: string;
};

export const UpsertTargetForm = ({ target, prefill, onSave }: Props) => {
  const isEdit = Boolean(target && target.name);
  const source = isEdit ? target : prefill;
  const handleSubmit = async (values: FormValues) => {
    const match = isEdit ? (target?.match ?? "") : (values.match ?? "");
    if (!values.url.trim() && !match.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "A URL or Match is required",
      });
      return;
    }
    try {
      await upsertTarget({
        url: values.url.trim() || undefined,
        name: isEdit ? target?.name : undefined,
        title: values.title || undefined,
        match: isEdit ? target?.match : values.match || undefined,
        strategy: values.strategy || undefined,
        pick: values.pick || undefined,
      });
      onSave();
      await popToRoot();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Save failed",
        message: String(err),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Target" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        defaultValue={source?.url ?? ""}
        placeholder="https://gemini.google.com"
        info="The page to open if no matching tab is found. Match and title are derived from it."
      />
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={source?.title ?? ""}
        placeholder="Derived from the URL (e.g. Gemini)"
      />
      {isEdit && target ? (
        <Form.Description title="ID" text={`Raycast: focus-${target.name}`} />
      ) : (
        <Form.Description title="ID" text="Generated from the title when saved and never changes afterwards." />
      )}
      <Form.Separator />
      <Form.Description title="Advanced" text="Optional overrides — leave blank to derive from the URL." />
      {isEdit && target ? (
        <Form.Description title="Match" text={target.match} />
      ) : (
        <Form.TextField
          id="match"
          title="Match"
          defaultValue={source?.match ?? ""}
          placeholder="Derived (the URL hostname)"
        />
      )}
      <Form.Dropdown id="strategy" title="Strategy" defaultValue={target?.strategy ?? "hostname"}>
        <Form.Dropdown.Item value="hostname" title="Hostname" />
        <Form.Dropdown.Item value="prefix" title="Prefix" />
        <Form.Dropdown.Item value="exact" title="Exact" />
        <Form.Dropdown.Item value="search" title="Search" />
      </Form.Dropdown>
      <Form.Dropdown id="pick" title="Pick" defaultValue={target?.pick ?? "recent"}>
        <Form.Dropdown.Item value="recent" title="Recent" />
        <Form.Dropdown.Item value="first" title="First" />
        <Form.Dropdown.Item value="pinned" title="Pinned" />
      </Form.Dropdown>
    </Form>
  );
};
