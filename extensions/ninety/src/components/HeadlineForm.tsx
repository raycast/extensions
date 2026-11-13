import { Action, ActionPanel, Form, Icon, open, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { createHeadline } from "../api/ninety";
import { Headline } from "../api/types";
import { useLastTeam } from "../hooks/useLastTeam";
import { useTeams } from "../hooks/useTeams";
import { showError } from "../lib/errors";
import { NinetyUrls } from "../lib/urls";

export interface HeadlineFormValues {
  title: string;
  description: string;
  teamId: string;
  isCascadedMessage: boolean;
}

interface Props {
  defaultTeamId?: string;
  defaultCascaded?: boolean;
  draftValues?: Partial<HeadlineFormValues>;
  onSaved?: (headline: Headline) => void;
  /** True when the form is a command's root view, where Raycast shows the command title. */
  isRoot?: boolean;
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function HeadlineForm({ defaultTeamId, defaultCascaded, draftValues, onSaved, isRoot }: Props) {
  const { pop } = useNavigation();
  const { teams, isLoading } = useTeams();
  const [lastTeamId, setLastTeamId] = useLastTeam();

  const { handleSubmit, itemProps, values, setValue } = useForm<HeadlineFormValues>({
    initialValues: {
      title: draftValues?.title ?? "",
      description: draftValues?.description ?? "",
      teamId: draftValues?.teamId ?? defaultTeamId ?? lastTeamId ?? "",
      isCascadedMessage: draftValues?.isCascadedMessage ?? defaultCascaded ?? false,
    },
    validation: { title: FormValidation.Required, teamId: FormValidation.Required },
    async onSubmit(values) {
      const kind = values.isCascadedMessage ? "Cascading Message" : "Headline";
      const toast = await showToast({ style: Toast.Style.Animated, title: `Creating ${kind}…` });
      try {
        const description = values.description.trim();
        const saved = await createHeadline({
          title: values.title.trim(),
          teamId: values.teamId,
          // The API expects an HTML body.
          description: description
            ? description
                .split(/\n{2,}/)
                .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
                .join("")
            : undefined,
          isCascadedMessage: values.isCascadedMessage,
        });
        setLastTeamId(values.teamId);
        toast.style = Toast.Style.Success;
        toast.title = `${kind} created`;
        toast.primaryAction = {
          title: "Open in Ninety",
          onAction: () =>
            open(
              saved?.id
                ? NinetyUrls.headline({ id: saved.id, teamId: saved.teamId ?? values.teamId })
                : NinetyUrls.headlines,
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
        await showError(error, `Couldn't create ${kind}`);
      }
    },
  });

  useEffect(() => {
    if (teams.length && !teams.some((team) => team._id === values.teamId)) setValue("teamId", teams[0]._id);
  }, [teams]);

  return (
    <Form
      isLoading={isLoading}
      enableDrafts={!!draftValues || !onSaved}
      navigationTitle={isRoot ? undefined : "Create Headline"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Headline" icon={Icon.Megaphone} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Headline" placeholder="Good or bad news to share" {...itemProps.title} />
      <Form.TextArea title="Details" placeholder="Optional" {...itemProps.description} />
      <Form.Dropdown title="Team" {...itemProps.teamId}>
        {teams.map((team) => (
          <Form.Dropdown.Item key={team._id} title={team.name} value={team._id} icon={Icon.TwoPeople} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        label="Cascading Message"
        info="Cascading Messages are passed from one Team (usually leadership) to the rest of the company."
        {...itemProps.isCascadedMessage}
      />
    </Form>
  );
}
