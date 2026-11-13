import { Action, ActionPanel, Form, Icon, open, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { createIssue, updateIssue } from "../api/ninety";
import { Issue, IssueInterval, LinkedItemType } from "../api/types";
import { useLastTeam } from "../hooks/useLastTeam";
import { useTeams } from "../hooks/useTeams";
import { showError } from "../lib/errors";
import { htmlToText } from "../lib/format";
import { NinetyUrls } from "../lib/urls";

export interface IssueFormValues {
  title: string;
  description: string;
  teamId: string;
  interval: string;
  priority: string;
}

interface Props {
  issue?: Issue;
  defaultTeamId?: string;
  link?: { id: string; type: Exclude<LinkedItemType, "issue">; title?: string };
  draftValues?: Partial<IssueFormValues>;
  onSaved?: (issue: Issue) => void;
  /** True when the form is a command's root view, where Raycast shows the command title. */
  isRoot?: boolean;
}

export function IssueForm({ issue, defaultTeamId, link, draftValues, onSaved, isRoot }: Props) {
  const { pop } = useNavigation();
  const { teams, isLoading } = useTeams();
  const [lastTeamId, setLastTeamId] = useLastTeam();
  const isEdit = !!issue;

  const { handleSubmit, itemProps, values, setValue } = useForm<IssueFormValues>({
    initialValues: {
      title: draftValues?.title ?? issue?.title ?? "",
      description: draftValues?.description ?? htmlToText(issue?.description),
      teamId: draftValues?.teamId ?? issue?.teamId ?? defaultTeamId ?? lastTeamId ?? "",
      interval: draftValues?.interval ?? issue?.intervalCode ?? "SHORT_TERM",
      priority: draftValues?.priority ?? String(issue?.priority ?? 0),
    },
    validation: { title: FormValidation.Required, teamId: FormValidation.Required },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: isEdit ? "Saving Issue…" : "Creating Issue…",
      });
      try {
        const payload = {
          title: values.title.trim(),
          description: isEdit ? values.description.trim() : values.description.trim() || undefined,
          teamId: values.teamId,
          interval: values.interval as IssueInterval,
          // 0 means no priority; send it so clearing a priority sticks.
          priority: Number(values.priority),
        };
        const saved = issue
          ? await updateIssue(issue.id, payload)
          : await createIssue({ ...payload, linkedItemId: link?.id, linkedItemType: link?.type });
        if (!isEdit) setLastTeamId(values.teamId);
        toast.style = Toast.Style.Success;
        toast.title = isEdit ? "Issue saved" : "Issue created";
        toast.primaryAction = {
          title: "Open in Ninety",
          onAction: () =>
            open(saved?.id ? NinetyUrls.issue({ ...saved, teamId: saved.teamId ?? values.teamId }) : NinetyUrls.issues),
        };
        if (onSaved) {
          onSaved(saved);
          pop();
        } else {
          await popToRoot({ clearSearchBar: true });
        }
      } catch (error) {
        toast.hide();
        await showError(error, isEdit ? "Couldn't save Issue" : "Couldn't create Issue");
      }
    },
  });

  // Fall back to the first Team once Teams load, so the dropdown and the value agree.
  useEffect(() => {
    if (teams.length && !teams.some((team) => team._id === values.teamId)) setValue("teamId", teams[0]._id);
  }, [teams]);

  return (
    <Form
      isLoading={isLoading}
      enableDrafts={!!draftValues || (!issue && !onSaved)}
      navigationTitle={isRoot ? undefined : isEdit ? "Edit Issue" : "Create Issue"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save Issue" : "Create Issue"}
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {link ? <Form.Description title="Linked to" text={link.title ?? link.type} /> : null}
      <Form.TextField title="Title" placeholder="What's the issue?" {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Optional context" {...itemProps.description} />
      <Form.Dropdown title="Team" {...itemProps.teamId}>
        {teams.map((team) => (
          <Form.Dropdown.Item key={team._id} title={team.name} value={team._id} icon={Icon.TwoPeople} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="List" {...itemProps.interval}>
        <Form.Dropdown.Item title="Short-Term" value="SHORT_TERM" />
        <Form.Dropdown.Item title="Long-Term" value="LONG_TERM" />
      </Form.Dropdown>
      <Form.Dropdown title="Priority" info="5 is the highest priority." {...itemProps.priority}>
        <Form.Dropdown.Item title="None" value="0" />
        {[5, 4, 3, 2, 1].map((p) => (
          <Form.Dropdown.Item
            key={p}
            title={`${p}${p === 5 ? " (Highest)" : p === 1 ? " (Lowest)" : ""}`}
            value={String(p)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
