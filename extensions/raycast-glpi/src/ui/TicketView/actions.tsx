import ActionPanelSectionServer from "@ui/components/actions/server";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import * as React from "react";
import * as Context from "@ui/context";
import * as KeyboardCustom from "@ui/keyboard";
import { Ticket } from "@api/glpi/types";
import { glpiIconTicketStatus } from "@ui/components/icons/glpi";
import { glpiTitleTicketStatus } from "@ui/components/titles/glpi";
import { showFailureToast } from "@raycast/utils";
import { ActionRefresh, ActionToggleDetail } from "@ui/components/actions/common";
import FollowupView from "@ui/FollowupView/main";
import { clientGlpi } from "@services/glpi";

interface Props {
  ticket?: Ticket;
}

export default function ActionTicket({ ticket }: Props): React.JSX.Element {
  return (
    <ActionPanel>
      <ActionPanelSectionTicket ticket={ticket} />
      <ActionPanelSectionServer />
    </ActionPanel>
  );
}

function ActionPanelSectionTicket({ ticket }: Props): React.JSX.Element {
  /* Context */
  const ctxGlpiServer = React.useContext(Context.glpiServer);
  const ctxShowDetail = React.useContext(Context.showDetail);

  const config = React.useMemo(() => {
    return ctxGlpiServer.glpiServerConfig?.find((v) => v.uuid === ctxGlpiServer.selectedGlpiServer);
  }, [ctxGlpiServer]);

  const url = React.useMemo(() => {
    if (!config) return;
    return new URL(`/front/ticket.form.php?id=${ticket?.id}`, config.endpoint);
  }, [config, ticket]);

  if (!ticket)
    return (
      <ActionPanel.Section title="Tickets">
        <ActionRefresh
          onAction={() => {
            if (ctxGlpiServer.revalidateData) ctxGlpiServer.revalidateData();
          }}
        />
      </ActionPanel.Section>
    );

  return (
    <React.Fragment>
      <ActionPanel.Section title="Tickets">
        <Action.Push
          title="Show Content"
          icon={Icon.Document}
          target={<Detail navigationTitle={`#${ticket?.id} - ${ticket?.name}`} markdown={ticket?.content} />}
        />
        {url && <Action.OpenInBrowser title="Open in Browser" url={url.href} />}
        {ctxShowDetail.setShowDetail && (
          <ActionToggleDetail showDetail={ctxShowDetail.showDetail} setShowDetail={ctxShowDetail.setShowDetail} />
        )}
        <ActionRefresh
          onAction={() => {
            if (ctxGlpiServer.revalidateData) ctxGlpiServer.revalidateData();
          }}
        />
        <ActionTicketChangeStatus ticket={ticket} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Folloups">
        {config && (
          <Action.Push
            title="Show Folloups"
            icon={Icon.SpeechBubble}
            shortcut={KeyboardCustom.PushFolloupView}
            target={<FollowupView glpiServerConfig={config} ticket={ticket} />}
            onPop={ctxGlpiServer.revalidateData}
          />
        )}
      </ActionPanel.Section>
    </React.Fragment>
  );
}

function ActionTicketChangeStatus({ ticket }: Props): React.JSX.Element | undefined {
  /* Context */
  const ctxIsLoading = React.useContext(Context.isLoading);
  const ctxGlpiServer = React.useContext(Context.glpiServer);

  const status = [1, 2, 3, 4, 5, 6];

  const onAction = React.useCallback(
    async (id: number) => {
      if (!ticket || !clientGlpi) return;

      try {
        await clientGlpi.patchAssistanceTicket(ticket.id, { status: { id: id } });
        if (ctxGlpiServer.revalidateData) ctxGlpiServer.revalidateData();
      } catch (e) {
        const error = e instanceof Error ? e : new Error("Error changing ticket status.", { cause: e });
        await showFailureToast(error);
      }
    },
    [ticket, ctxGlpiServer],
  );

  if (ctxIsLoading.isLoading || !ticket) return undefined;

  return (
    <ActionPanel.Submenu title="Change Status" icon={Icon.Pencil} shortcut={KeyboardCustom.ChangeStatus}>
      {status.map((v) => (
        <Action
          key={v}
          title={`${glpiTitleTicketStatus[v]}${v === ticket?.status.id ? " [Current]" : ""}`}
          icon={glpiIconTicketStatus[v]}
          autoFocus={v === ticket?.status.id}
          onAction={() => onAction(v)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
