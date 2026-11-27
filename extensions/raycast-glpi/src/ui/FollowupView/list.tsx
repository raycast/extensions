import * as React from "react";
import type * as Types from "@ui/types";
import * as Context from "@ui/context";
import { Followup, ResBodyGetAssistanceTicketTimelineFollowup, Ticket } from "@api/glpi/types";
import { Color, Detail, Icon, List } from "@raycast/api";
import ActionFollowup from "./actions";

interface ListFollowupsProps {
  config: Types.GlpiServer;
  ticket: Ticket;
  revalidateFollowups: () => void;
  followups?: ResBodyGetAssistanceTicketTimelineFollowup;
}

export default function ListFollowups({
  config,
  ticket,
  revalidateFollowups,
  followups,
}: ListFollowupsProps): React.JSX.Element {
  /* Context */
  const ctxIsLoading = React.useContext(Context.isLoading);

  /* Show Loading Empty View */
  if (!followups && ctxIsLoading.isLoading)
    return (
      <List isLoading={ctxIsLoading.isLoading}>
        <List.EmptyView
          actions={<ActionFollowup config={config} ticket={ticket} revalidateFolloups={revalidateFollowups} />}
          icon={Icon.CircleProgress}
          title="Loading Data..."
        />
      </List>
    );

  /* Show Empty View */
  if (followups?.length === 0)
    return (
      <List isLoading={ctxIsLoading.isLoading}>
        <List.EmptyView
          actions={<ActionFollowup config={config} ticket={ticket} revalidateFolloups={revalidateFollowups} />}
          icon={Icon.SpeechBubbleImportant}
          title={`Ticket #${ticket.id}, Title: ${ticket.name}`}
          description="Do not contain folloups."
        />
      </List>
    );

  /* Show List */
  return (
    <List
      actions={<ActionFollowup config={config} ticket={ticket} revalidateFolloups={revalidateFollowups} />}
      isLoading={ctxIsLoading.isLoading}
      isShowingDetail={true}
    >
      {followups?.map((v, i) => (
        <ListFollowupsItem
          key={i}
          config={config}
          ticket={ticket}
          revalidateFollowups={revalidateFollowups}
          followup={v}
        />
      ))}
    </List>
  );
}

interface ListFollowupsItemProps {
  config: Types.GlpiServer;
  ticket: Ticket;
  revalidateFollowups: () => void;
  followup: Followup;
}

function ListFollowupsItem({
  config,
  ticket,
  revalidateFollowups,
  followup,
}: ListFollowupsItemProps): React.JSX.Element {
  /* keywords */
  const keywords = React.useMemo(() => {
    let k = [String(ticket.id), ticket.category.name];

    /* Team */
    const requester = ticket.team.filter((v) => v.role === "requester");
    if (requester) k = k.concat(requester.map((v) => `requester: ${v.name}`));
    const assigned = ticket.team.filter((v) => v.role === "assigned");
    if (assigned) k = k.concat(assigned.map((v) => `assigned: ${v.name}`));
    const observer = ticket.team.filter((v) => v.role === "observer");
    if (observer) k = k.concat(observer.map((v) => `observer: ${v.name}`));

    return k;
  }, [ticket]);

  /* accessory */
  const accessory = React.useMemo(() => {
    const a: List.Item.Accessory[] = [];

    if (followup.item.is_private) a.push({ icon: Icon.EyeDisabled, tag: { color: Color.Red, value: "" } });
    a.push({ icon: Icon.Calendar, tag: { color: Color.Purple, value: new Date(followup.item.date) } });

    return a;
  }, [followup]);

  return (
    <List.Item
      id={String(followup.item.id)}
      icon={Icon.SpeechBubble}
      title={followup.item.user.name}
      accessories={accessory}
      keywords={keywords}
      detail={<DetailFollowup followup={followup} />}
      actions={
        <ActionFollowup config={config} ticket={ticket} followup={followup} revalidateFolloups={revalidateFollowups} />
      }
    />
  );
}

interface DetailFollowupProps {
  followup: Followup;
}

function DetailFollowup({ followup }: DetailFollowupProps) {
  /* Dates */
  const date = React.useMemo(() => {
    const date = new Date(followup.item.date);
    const currentDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const currentTime = date.toLocaleTimeString("en-US");
    return `${currentDate} ${currentTime}`;
  }, [followup]);

  return (
    <List.Item.Detail
      markdown={followup.item.content}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="id" icon={Icon.Hashtag} text={String(followup.item.id)} />
          <Detail.Metadata.Label title="Ticket Id" icon={Icon.Hashtag} text={String(followup.item.items_id)} />
          <Detail.Metadata.Label
            title="Is Private"
            icon={followup.item.is_private ? Icon.EyeDisabled : Icon.Eye}
            text={followup.item.is_private ? "True" : "False"}
          />
          <Detail.Metadata.Label title="User" icon={Icon.Person} text={followup.item.user.name} />
          <Detail.Metadata.Label title="Date" icon={Icon.Calendar} text={date} />
        </Detail.Metadata>
      }
    />
  );
}
