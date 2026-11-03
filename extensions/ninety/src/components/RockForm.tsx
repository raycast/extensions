import { Action, ActionPanel, Form, Icon, open, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { createRock, updateRock } from "../api/ninety";
import { Rock, RockLevel, RockQuarter, RockStatus } from "../api/types";
import { useLastTeam } from "../hooks/useLastTeam";
import { useTeams } from "../hooks/useTeams";
import { showError } from "../lib/errors";
import { endOfCurrentQuarter, htmlToText, parseDueDate, ROCK_STATUSES, toNinetyDate } from "../lib/format";
import { NinetyUrls } from "../lib/urls";

export interface RockFormValues {
  title: string;
  description: string;
  teamId: string;
  dueDate: Date | null;
  statusCode: string;
  levelCode: string;
}

const LEVELS: { value: RockLevel; title: string }[] = [
  { value: "DEPARTMENT", title: "Departmental" },
  { value: "COMPANY", title: "Company" },
  { value: "COMPANY_AND_DEPARTMENT", title: "Company & Departmental" },
  { value: "USER", title: "Individual" },
];

interface Props {
  rock?: Rock;
  defaultTeamId?: string;
  draftValues?: Partial<RockFormValues>;
  onSaved?: (rock: Rock) => void;
  /** True when the form is a command's root view, where Raycast shows the command title. */
  isRoot?: boolean;
}

function quarterOf(date: Date): RockQuarter {
  return `Q${Math.floor(date.getMonth() / 3) + 1}` as RockQuarter;
}

export function RockForm({ rock, defaultTeamId, draftValues, onSaved, isRoot }: Props) {
  const { pop } = useNavigation();
  const { teams, isLoading } = useTeams();
  const [lastTeamId, setLastTeamId] = useLastTeam();
  const isEdit = !!rock;

  const { handleSubmit, itemProps, values, setValue } = useForm<RockFormValues>({
    initialValues: {
      title: draftValues?.title ?? rock?.title ?? "",
      description: draftValues?.description ?? htmlToText(rock?.description),
      teamId: draftValues?.teamId ?? rock?.teamId ?? defaultTeamId ?? lastTeamId ?? "",
      dueDate: draftValues?.dueDate ?? (rock ? (parseDueDate(rock.dueDate) ?? null) : endOfCurrentQuarter()),
      statusCode: draftValues?.statusCode ?? rock?.statusCode ?? "ON_TRACK",
      levelCode: draftValues?.levelCode ?? rock?.levelCode ?? "DEPARTMENT",
    },
    validation: {
      title: FormValidation.Required,
      teamId: FormValidation.Required,
      dueDate: FormValidation.Required,
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: isEdit ? "Saving Rock…" : "Creating Rock…" });
      try {
        const dueDate = values.dueDate ?? endOfCurrentQuarter();
        const common = {
          title: values.title.trim(),
          description: isEdit ? values.description.trim() : values.description.trim() || undefined,
          dueDate: toNinetyDate(dueDate),
          statusCode: values.statusCode as RockStatus,
          levelCode: values.levelCode as RockLevel,
        };
        const saved = rock
          ? await updateRock(rock._id, common)
          : await createRock({ ...common, teamId: values.teamId, quarter: quarterOf(dueDate) });
        if (!isEdit) setLastTeamId(values.teamId);
        toast.style = Toast.Style.Success;
        toast.title = isEdit ? "Rock saved" : "Rock created";
        toast.primaryAction = {
          title: "Open in Ninety",
          onAction: () =>
            open(
              saved?._id
                ? NinetyUrls.rock({ _id: saved._id, teamId: saved.teamId ?? values.teamId })
                : NinetyUrls.rocks,
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
        await showError(error, isEdit ? "Couldn't save Rock" : "Couldn't create Rock");
      }
    },
  });

  useEffect(() => {
    if (!isEdit && teams.length && !teams.some((team) => team._id === values.teamId)) {
      setValue("teamId", teams[0]._id);
    }
  }, [teams]);

  return (
    <Form
      isLoading={isLoading}
      enableDrafts={!!draftValues || (!rock && !onSaved)}
      navigationTitle={isRoot ? undefined : isEdit ? "Edit Rock" : "Create Rock"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save Rock" : "Create Rock"}
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="What will be true by the end of the quarter?" {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Optional" {...itemProps.description} />
      {isEdit ? null : (
        <Form.Dropdown title="Team" info="Rocks are always owned by you." {...itemProps.teamId}>
          {teams.map((team) => (
            <Form.Dropdown.Item key={team._id} title={team.name} value={team._id} icon={Icon.TwoPeople} />
          ))}
        </Form.Dropdown>
      )}
      <Form.DatePicker title="Due Date" type={Form.DatePicker.Type.Date} {...itemProps.dueDate} />
      <Form.Dropdown title="Status" {...itemProps.statusCode}>
        {ROCK_STATUSES.map((status) => (
          <Form.Dropdown.Item key={status.value} title={status.title} value={status.value} icon={status.icon} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Type" {...itemProps.levelCode}>
        {LEVELS.map((level) => (
          <Form.Dropdown.Item key={level.value} title={level.title} value={level.value} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
