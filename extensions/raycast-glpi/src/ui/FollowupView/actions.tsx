import * as React from "react";
import type * as Types from "@ui/types";
import { Followup, Ticket } from "@api/glpi/types";
import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { ActionRefresh } from "@ui/components/actions/common";
import FollowupForm from "@ui/FollowupForm/main";

interface Props {
  config: Types.GlpiServer;
  ticket: Ticket;
  revalidateFolloups: () => void;
  followup?: Followup;
}

export default function ActionFollowup({ config, ticket, revalidateFolloups, followup }: Props): React.JSX.Element {
  const url = React.useMemo(() => {
    return new URL(`/front/ticket.form.php?id=${ticket.id}`, config.endpoint);
  }, [config]);

  const showAddFollowup = React.useMemo(() => {
    return ticket.status.id < 5;
  }, [ticket]);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Followups">
        {followup && (
          <Action.Push
            title="Show Content"
            icon={Icon.Document}
            target={<Detail navigationTitle={`#${ticket.id} - ${ticket.name}`} markdown={followup.item.content} />}
          />
        )}
        {url && <Action.OpenInBrowser title="Open in Browser" url={url.href} />}
        <ActionRefresh onAction={revalidateFolloups} />
        {showAddFollowup && (
          <Action.Push
            title="Add Followup"
            icon={Icon.SpeechBubbleActive}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<FollowupForm ticket={ticket} />}
            onPop={revalidateFolloups}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
