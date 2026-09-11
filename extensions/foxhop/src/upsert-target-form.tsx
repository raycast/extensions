import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { upsertTarget, Target } from "./foxhop";

type Props = {
  target?: Target;
  onSave: () => void;
};

type FormValues = {
  url: string;
  title: string;
  name: string;
  match: string;
  strategy: string;
  pick: string;
};

export const UpsertTargetForm = ({ target, onSave }: Props) => {
  const handleSubmit = async (values: FormValues) => {
    if (!values.url.trim() && !values.match.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "A URL or Match is required",
      });
      return;
    }
    try {
      await upsertTarget({
        url: values.url.trim() || undefined,
        name: values.name || undefined,
        title: values.title || undefined,
        match: values.match || undefined,
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
        defaultValue={target?.url ?? ""}
        placeholder="https://gemini.google.com"
        info="The page to open if no matching tab is found. Name, match, and title are derived from it."
      />
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={target?.title ?? ""}
        placeholder="Derived from the URL (e.g. Gemini)"
      />
      <Form.Separator />
      <Form.Description title="Advanced" text="Optional overrides — leave blank to derive from the URL." />
      <Form.TextField id="name" title="Name" defaultValue={target?.name ?? ""} placeholder="Derived (e.g. gemini)" />
      <Form.TextField
        id="match"
        title="Match"
        defaultValue={target?.match ?? ""}
        placeholder="Derived (the URL hostname)"
      />
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
