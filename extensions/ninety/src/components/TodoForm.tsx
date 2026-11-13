import { Action, ActionPanel, Form, Icon, open, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createTodo, updateTodo } from "../api/ninety";
import { LinkedItemType, Todo } from "../api/types";
import { useLastTeam } from "../hooks/useLastTeam";
import { useTeams } from "../hooks/useTeams";
import { showError } from "../lib/errors";
import { htmlToText, parseDueDate, toNinetyDate } from "../lib/format";
import { NinetyUrls } from "../lib/urls";

const PERSONAL = "__personal__";

export interface TodoFormValues {
  title: string;
  description: string;
  teamId: string;
  dueDate: Date | null;
}

interface Props {
  todo?: Todo;
  defaultTeamId?: string;
  /** Link the new To-Do to an Issue, Rock or Milestone. */
  link?: {
    id: string;
    type: Exclude<LinkedItemType, "todo">;
    title?: string;
  };
  draftValues?: Partial<TodoFormValues>;
  onSaved?: (todo: Todo) => void;
  /** True when the form is a command's root view, where Raycast shows the command title. */
  isRoot?: boolean;
}

function inSevenDays() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

export function TodoForm({ todo, defaultTeamId, link, draftValues, onSaved, isRoot }: Props) {
  const { pop } = useNavigation();
  const { teams, isLoading } = useTeams();
  const [lastTeamId, setLastTeamId] = useLastTeam();
  const isEdit = !!todo;

  const { handleSubmit, itemProps } = useForm<TodoFormValues>({
    initialValues: {
      title: draftValues?.title ?? todo?.title ?? "",
      description: draftValues?.description ?? htmlToText(todo?.description),
      teamId: draftValues?.teamId ?? (todo ? todo.teamId || PERSONAL : (defaultTeamId ?? lastTeamId ?? PERSONAL)),
      dueDate: draftValues?.dueDate ?? (todo ? (parseDueDate(todo.dueDate) ?? null) : inSevenDays()),
    },
    validation: {
      title: FormValidation.Required,
      // The API has no way to remove a due date, so don't let an edit look like it did.
      dueDate: (value) => (todo?.dueDate && !value ? "Ninety can't remove a due date. Pick a new one." : undefined),
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: isEdit ? "Saving To-Do…" : "Creating To-Do…",
      });
      try {
        const teamId = values.teamId === PERSONAL ? "" : values.teamId;
        const payload = {
          title: values.title.trim(),
          // An empty string clears the description on edit; undefined would leave it unchanged.
          description: isEdit ? values.description.trim() : values.description.trim() || undefined,
          dueDate: values.dueDate ? toNinetyDate(values.dueDate) : undefined,
        };
        const saved = todo
          ? await updateTodo(todo.id, { ...payload, teamId: teamId || undefined })
          : await createTodo({
              ...payload,
              teamId,
              linkedItemId: link?.id,
              linkedItemType: link?.type,
            });
        if (!isEdit) setLastTeamId(values.teamId);
        toast.style = Toast.Style.Success;
        toast.title = isEdit ? "To-Do saved" : "To-Do created";
        toast.primaryAction = {
          title: "Open in Ninety",
          onAction: () =>
            open(
              saved?.id
                ? NinetyUrls.todo({
                    id: saved.id,
                    isPersonal: saved.isPersonal ?? values.teamId === PERSONAL,
                    teamId: saved.teamId ?? (values.teamId === PERSONAL ? undefined : values.teamId),
                  })
                : NinetyUrls.todos,
            ),
        };
        if (onSaved) {
          onSaved(saved);
          pop();
        } else {
          await popToRoot({ clearSearchBar: true });
        }
      } catch (error) {
        toast.hide();
        await showError(error, isEdit ? "Couldn't save To-Do" : "Couldn't create To-Do");
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      enableDrafts={!!draftValues || (!todo && !onSaved)}
      navigationTitle={isRoot ? undefined : isEdit ? "Edit To-Do" : "Create To-Do"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save To-Do" : "Create To-Do"}
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {link ? <Form.Description title="Linked to" text={link.title ?? link.type} /> : null}
      <Form.TextField title="Title" placeholder="What needs to get done?" {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Optional details" {...itemProps.description} />
      <Form.Dropdown title="Team" info="Personal To-Dos are only visible to you." {...itemProps.teamId}>
        {/* The API can't move a Team To-Do to Personal, so only offer Personal where it can apply. */}
        {!todo || !todo.teamId ? <Form.Dropdown.Item title="Personal" value={PERSONAL} icon={Icon.Person} /> : null}
        {teams.map((team) => (
          <Form.Dropdown.Item key={team._id} title={team.name} value={team._id} icon={Icon.TwoPeople} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker title="Due Date" type={Form.DatePicker.Type.Date} {...itemProps.dueDate} />
    </Form>
  );
}
