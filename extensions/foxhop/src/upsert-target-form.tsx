import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { addTarget, editTarget, Target } from "./foxhop";

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
  navigate: boolean;
};

export const UpsertTargetForm = ({ target, prefill, onSave }: Props) => {
  const editing = target?.name ? target : undefined;
  const source = editing ?? prefill;
  const handleSubmit = async (values: FormValues) => {
    const url = values.url.trim();
    const title = values.title.trim();
    const match = values.match.trim();
    // An edit keeps the target's own match, so it cannot be blanked; a new
    // target needs a URL or a match to derive from.
    if (editing ? !match : !url && !match) {
      await showToast({
        style: Toast.Style.Failure,
        title: editing ? "Match is required" : "A URL or Match is required",
      });
      return;
    }
    try {
      if (editing) {
        await editTarget(editing.name, { ...values, url, title, match });
      } else {
        await addTarget({
          url: url || undefined,
          title: title || undefined,
          match: match || undefined,
          strategy: values.strategy || undefined,
          pick: values.pick || undefined,
          navigate: values.navigate,
        });
      }
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
        info={
          editing
            ? "The page to open if no matching tab is found."
            : "The page to open if no matching tab is found. Match and title are derived from it."
        }
      />
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={source?.title ?? ""}
        placeholder={editing ? editing.name : "Derived from the URL (e.g. Gemini)"}
      />
      <Form.Description
        title="ID"
        text={
          editing
            ? `${editing.name} · Raycast: focus-${editing.name}`
            : "Generated from the title when saved and never changes afterwards."
        }
      />
      <Form.Separator />
      <Form.Description
        title="Advanced"
        text={editing ? "How the target finds its tab." : "Optional overrides — leave blank to derive from the URL."}
      />
      <Form.TextField
        id="match"
        title="Match"
        defaultValue={source?.match ?? ""}
        placeholder={editing ? "e.g. mail.google.com" : "Derived (the URL hostname)"}
      />
      <Form.Dropdown id="strategy" title="Strategy" defaultValue={editing?.strategy ?? "hostname"}>
        <Form.Dropdown.Item value="hostname" title="Hostname" />
        <Form.Dropdown.Item value="prefix" title="Prefix" />
        <Form.Dropdown.Item value="exact" title="Exact" />
        <Form.Dropdown.Item value="search" title="Search" />
      </Form.Dropdown>
      <Form.Dropdown id="pick" title="Pick" defaultValue={editing?.pick ?? "recent"}>
        <Form.Dropdown.Item value="recent" title="Recent" />
        <Form.Dropdown.Item value="first" title="First" />
        <Form.Dropdown.Item value="pinned" title="Pinned" />
      </Form.Dropdown>
      <Form.Checkbox
        id="navigate"
        title="Navigate"
        label="Navigate the matching tab to a requested URL"
        defaultValue={editing?.navigate ?? false}
        info="With `foxhop focus <id> --url <url>`, reuse the existing tab instead of opening another. The URL must fall within Match."
      />
    </Form>
  );
};
