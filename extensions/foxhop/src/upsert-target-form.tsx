import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { upsertTarget, Target } from "./foxhop";

type Props = {
  target?: Target;
  onSave: () => void;
};

type FormValues = {
  name: string;
  title: string;
  match: string;
  url: string;
  strategy: string;
  pick: string;
};

export const UpsertTargetForm = ({ target, onSave }: Props) => {
  const { pop } = useNavigation();

  const handleSubmit = async (values: FormValues) => {
    try {
      await upsertTarget({
        name: values.name,
        match: values.match,
        title: values.title || undefined,
        url: values.url || undefined,
        strategy: values.strategy || undefined,
        pick: values.pick || undefined,
      });
      onSave();
      pop();
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
        id="name"
        title="Name"
        defaultValue={target?.name ?? ""}
        placeholder="e.g. github"
      />
      <Form.TextField
        id="title"
        title="Title (optional)"
        defaultValue={target?.title ?? ""}
        placeholder="e.g. GitHub"
      />
      <Form.TextField
        id="match"
        title="Match"
        defaultValue={target?.match ?? ""}
        placeholder="e.g. github.com"
      />
      <Form.TextField
        id="url"
        title="URL (optional)"
        defaultValue={target?.url ?? ""}
        placeholder="https://github.com"
      />
      <Form.Dropdown
        id="strategy"
        title="Strategy"
        defaultValue={target?.strategy ?? "hostname"}
      >
        <Form.Dropdown.Item value="hostname" title="hostname" />
        <Form.Dropdown.Item value="prefix" title="prefix" />
        <Form.Dropdown.Item value="exact" title="exact" />
        <Form.Dropdown.Item value="search" title="search" />
      </Form.Dropdown>
      <Form.Dropdown
        id="pick"
        title="Pick"
        defaultValue={target?.pick ?? "recent"}
      >
        <Form.Dropdown.Item value="recent" title="recent" />
        <Form.Dropdown.Item value="first" title="first" />
        <Form.Dropdown.Item value="pinned" title="pinned" />
      </Form.Dropdown>
    </Form>
  );
};
