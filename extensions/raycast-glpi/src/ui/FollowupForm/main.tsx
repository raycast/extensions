import { Ticket } from "@api/glpi/types";
import { GlpiApiError } from "@api/glpi/main";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, useCachedPromise } from "@raycast/utils";
import { clientGlpi, getDropdownFollowupTemplates } from "@services/glpi";
import { glpiIconTicketStatus } from "@ui/components/icons/glpi";
import { glpiTitleTicketStatus } from "@ui/components/titles/glpi";
import AuthForm from "@ui/AuthForm/main";
import * as Context from "@ui/context";
import * as React from "react";

interface Props {
  ticket: Ticket;
}

interface FormData {
  /**
   * Followup Content.
   */
  content: string;

  /**
   * Ticket New Status.
   */
  newStatus: string;

  /**
   * Followup Is Provate.
   */
  isPrivate: boolean;

  /**
   * Ticket Assign to current user.
   */
  assignToCurrentUser?: boolean;
}

export default function FollowupForm({ ticket }: Props): React.ReactElement {
  /* Raycast */
  const { pop, push } = useNavigation();

  /* GLPI Server Config */
  const { glpiServerConfig, selectedGlpiServer } = React.useContext(Context.glpiServer);

  /* UI */
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  /* Followup Templates */
  const { data: followupTemplates, isLoading: isLoadingFollowupTemplates } = useCachedPromise(
    getDropdownFollowupTemplates,
    [],
    {
      onError(error) {
        if (error instanceof GlpiApiError && error.code === "GLPI_API_SERVER_AUTH_EXPIRED") {
          const server = glpiServerConfig?.find((v) => v.uuid === selectedGlpiServer);
          if (server) push(<AuthForm glpiServer={server} />);
          return;
        }
        showFailureToast(error);
      },
    },
  );

  /* Merged isLoading */
  const isLoadingTotal = React.useMemo(() => {
    return isLoading || isLoadingFollowupTemplates;
  }, [isLoading, isLoadingFollowupTemplates]);

  /**
   * Submit form function.
   *
   * @param value - Form data.
   */
  const Submit = React.useCallback(
    async (value: FormData) => {
      if (isLoadingTotal) return;

      /* Error: `clientGlpi` undefined */
      if (!clientGlpi) {
        console.error("Component: <AuthForm/>. Function `Submit` called with undefined `clientGlpi`");
        return;
      }

      /* Followup can't be added on solved or closed ticket */
      if (Number(ticket.status.id) >= 5) {
        const statusText: Record<number, string> = {
          5: "Solved",
          6: "Closed",
        };
        await showToast({
          style: Toast.Style.Failure,
          title: `Followup can't be added on ${statusText[Number(value.newStatus)]} ticket.`,
        });
        return;
      }

      /* Set Loading */
      setIsLoading(true);

      try {
        /* Assign ticket if requested */
        if (value.assignToCurrentUser) {
          const session = await clientGlpi.getSession();

          /* Skip if allready assigned */
          if (ticket.team.findIndex((v) => v.role === "assigned" && v.id === session.user_id) < 0)
            await clientGlpi.postAssistanceTicketTeamMember(ticket.id, {
              type: "User",
              role: "assigned",
              id: session.user_id,
            });
        }

        /* Post Followup */
        await clientGlpi.postAssistanceTicketTimelineFollowup(ticket.id, {
          content: value.content,
          is_private: value.isPrivate,
        });

        /* Change status if requested */
        const newStatus = Number(value.newStatus);
        if (newStatus !== ticket.status.id) {
          await clientGlpi.patchAssistanceTicket(ticket.id, { status: { id: newStatus } });
        }
      } catch (e) {
        const error = e instanceof Error ? e : new Error("Unknown error creating followup", { cause: e });
        await showFailureToast(error);
      }

      /* Set Loading */
      setIsLoading(false);
      pop();
    },
    [ticket, isLoadingTotal],
  );

  /* Form */
  const { handleSubmit, itemProps, setValue } = useForm<FormData>({
    onSubmit: Submit,
    initialValues: {
      newStatus: String(ticket.status.id),
      isPrivate: false,
      assignToCurrentUser: false,
    },
    validation: {
      content: FormValidation.Required,
      newStatus: FormValidation.Required,
      isPrivate: FormValidation.Required,
      assignToCurrentUser: FormValidation.Required,
    },
  });

  /* Followup Template */
  const [templateId, setTemplateId] = React.useState<string>("");

  const onChangeTemplate = React.useCallback(
    (value: string) => {
      setTemplateId(value);

      /* No template selected: clear Message TextArea */
      if (value === "") {
        setValue("content", "");
        return;
      }

      /* Template selected: write its content on Message TextArea */
      const template = followupTemplates?.find((v) => String(v.id) === value);
      if (template) setValue("content", template.content);
    },
    [followupTemplates, setValue],
  );

  /* <ActionPanel> */
  const actionPanel = React.useMemo(() => {
    if (isLoadingTotal) return <ActionPanel />;
    return (
      <ActionPanel>
        <Action.SubmitForm title="Answer" icon={Icon.SpeechBubble} onSubmit={handleSubmit} />
      </ActionPanel>
    );
  }, [isLoadingTotal, handleSubmit]);

  return (
    <Form actions={actionPanel} isLoading={isLoadingTotal}>
      <Form.Description text={`Ticket #${ticket.id} - ${ticket.name}`} />
      <Form.Dropdown id="template" title="Template" value={templateId} onChange={onChangeTemplate} autoFocus={true}>
        <Form.Dropdown.Item title="None" value="" icon={Icon.Circle} />
        {followupTemplates?.map((template) => (
          <Form.Dropdown.Item
            key={template.id}
            title={template.name}
            value={String(template.id)}
            icon={Icon.Document}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Message" enableMarkdown={true} {...itemProps.content} />
      <Form.Dropdown title="Status" {...itemProps.newStatus}>
        {Object.entries(glpiTitleTicketStatus).map(([k, v]) => (
          <Form.Dropdown.Item key={v} title={v} value={String(k)} icon={glpiIconTicketStatus[Number(k)]} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox label="Private" {...itemProps.isPrivate} />
      <Form.Checkbox label="Assign to Me" {...itemProps.assignToCurrentUser} />
    </Form>
  );
}
