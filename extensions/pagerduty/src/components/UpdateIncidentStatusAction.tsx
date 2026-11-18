import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { IncidentItem, IncidentStatus, GetMeResponse, UpdateIncidentResponse } from "../types";
import { pagerDutyClient } from "../api";

interface UpdateIncidentStatusActionProps {
  item: IncidentItem;
  mutateIncidents: MutatePromise<IncidentItem[]>;
}

export function UpdateIncidentStatusAction({ item, mutateIncidents }: UpdateIncidentStatusActionProps) {
  async function onUpdateIncidentStatus(
    incident: IncidentItem,
    newStatus: IncidentStatus,
    note: string | undefined = undefined,
  ) {
    const toast = await showToast(Toast.Style.Animated, "Updating...", "Getting user info");

    try {
      const me = await pagerDutyClient.get<GetMeResponse>("/users/me");
      if (note) {
        toast.message = "Adding note";
        await pagerDutyClient.post(`/incidents/${incident.id}/notes`, {
          headers: { from: me.user.email },
          body: JSON.stringify({
            note: { content: note },
          }),
        });
      }
      toast.message = "Updating incident";
      await mutateIncidents(
        pagerDutyClient.put<UpdateIncidentResponse>(`/incidents/${incident.id}`, {
          headers: { from: me.user.email },
          body: JSON.stringify({
            incident: {
              type: "incident",
              status: newStatus,
            },
          }),
        }),
        {
          optimisticUpdate(data) {
            return data.map((i) => (i.id === incident.id ? { ...i, status: newStatus } : i));
          },
          shouldRevalidateAfter: true,
        },
      );

      toast.style = Toast.Style.Success;
      toast.title = `Incident #${incident.incident_number} has been ${newStatus}.`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `${error}`;
    }
  }

  const resolveAction = (
    <Action.Push
      key={item.id}
      icon={Icon.Checkmark}
      title={"Resolve Incident"}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      target={<ResolveIncidentForm onSubmit={(note) => onUpdateIncidentStatus(item, "resolved", note)} />}
    />
  );

  const acknowledgeAction = (
    <Action
      title={"Acknowledge Incident"}
      icon={Icon.Clock}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={() => onUpdateIncidentStatus(item, "acknowledged")}
    />
  );

  if (item.status === "resolved") {
    return <></>;
  } else if (item.status === "acknowledged") {
    return resolveAction;
  } else {
    return (
      <>
        {acknowledgeAction}
        {resolveAction}
      </>
    );
  }
}

function ResolveIncidentForm(props: { onSubmit: (note: string | undefined) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Text}
            title="Resolve Incident"
            onSubmit={(values) => props.onSubmit(values.note)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="note"
        title="Resolution Note"
        placeholder="(Optional) Put some note to describe what you did to resolve this incident."
      />
    </Form>
  );
}
