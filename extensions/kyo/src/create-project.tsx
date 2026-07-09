import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Projects } from "./api/resources";
import { useSpaces } from "./hooks/useLookups";
import { showKyoError, toDateOnly } from "./lib/helpers";
import { LogOutAction } from "./components/AuthActions";

interface ProjectFormValues {
  name: string;
  space_id: string;
  start_date: Date | null;
  end_date: Date | null;
  kanban_enabled: boolean;
}

/** Standalone "Create Project" command. Also reachable from a space's detail. */
export default function CreateProject({
  presetSpaceId,
}: {
  presetSpaceId?: string;
}) {
  const { pop } = useNavigation();
  const { data: spaces, isLoading } = useSpaces();

  async function submit(values: ProjectFormValues) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    if (!values.space_id) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Space is required",
      });
      return;
    }
    try {
      const project = await Projects.create({
        space_id: values.space_id,
        name: values.name.trim(),
        start_date: toDateOnly(values.start_date) ?? undefined,
        end_date: toDateOnly(values.end_date) ?? undefined,
        kanban_enabled: values.kanban_enabled || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Project created",
        message: project.name,
      });
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to create project");
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Project"
            icon={Icon.Plus}
            onSubmit={submit}
          />
          <LogOutAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Website redesign" />
      <Form.Dropdown id="space_id" title="Space" defaultValue={presetSpaceId}>
        <Form.Dropdown.Item value="" title="Select a space…" />
        {spaces.map((s) => (
          <Form.Dropdown.Item key={s.id} value={s.id} title={s.name} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="start_date"
        title="Start Date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.DatePicker
        id="end_date"
        title="End Date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.Checkbox id="kanban_enabled" label="Enable Kanban board" />
    </Form>
  );
}
