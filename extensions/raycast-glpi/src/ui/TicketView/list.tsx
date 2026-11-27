import { ResBodyGetAssistanceTicket, Ticket } from "@api/glpi/types";
import * as React from "react";
import * as Context from "@ui/context";
import { Color, Detail, Icon, List } from "@raycast/api";
import ActionTicket from "./actions";
import SearchBarAccessory from "./searchBarAccessory";
import { glpiIconTicketStatus } from "@ui/components/icons/glpi";

interface ListTicketsProps {
  tikets?: ResBodyGetAssistanceTicket;
  setFilter: React.Dispatch<React.SetStateAction<string>>;
}

export default function ListTickets({ tikets, setFilter }: ListTicketsProps): React.JSX.Element {
  /* Context */
  const ctxIsLoading = React.useContext(Context.isLoading);

  /* Show Detail */
  const [showDetail, setShowDetail] = React.useState(false);
  const ctxShowDetail = React.useMemo(() => {
    return {
      showDetail,
      setShowDetail,
    };
  }, [showDetail]);

  /* Show Loading Empty View */
  if (!tikets && ctxIsLoading.isLoading)
    return (
      <List isLoading={ctxIsLoading.isLoading} searchBarAccessory={<SearchBarAccessory setFilter={setFilter} />}>
        <List.EmptyView actions={<ActionTicket />} icon={Icon.CircleProgress} title="Loading Data..." />
      </List>
    );

  /* Show Empty View */
  if (tikets?.length === 0)
    return (
      <List isLoading={ctxIsLoading.isLoading} searchBarAccessory={<SearchBarAccessory setFilter={setFilter} />}>
        <List.EmptyView
          actions={<ActionTicket />}
          icon={Icon.ThumbsUp}
          title="Current Tickets: 0"
          description="Enjoy the peace and quiet while it lasts! 🤫"
        />
      </List>
    );

  /* Show List */
  return (
    <Context.showDetail value={ctxShowDetail}>
      <List
        actions={<ActionTicket />}
        isLoading={ctxIsLoading.isLoading}
        isShowingDetail={showDetail}
        searchBarAccessory={<SearchBarAccessory setFilter={setFilter} />}
      >
        {tikets?.map((t, i) => (
          <ListTicketsItem ticket={t} key={i} />
        ))}
      </List>
    </Context.showDetail>
  );
}

interface ListTicketsItemProps {
  ticket: Ticket;
}

function ListTicketsItem({ ticket }: ListTicketsItemProps): React.JSX.Element {
  /* Context */
  const ctxShowDetail = React.useContext(Context.showDetail);

  /* keywords */
  const keywords = React.useMemo(() => {
    let k = [String(ticket.id), ticket.category.name ?? "No Category"];

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
    if (ctxShowDetail.showDetail) return [];

    const a: List.Item.Accessory[] = [
      { icon: Icon.Hashtag, tag: { color: Color.PrimaryText, value: String(ticket.id) } },
      { icon: Icon.Calendar, tag: { color: Color.Purple, value: new Date(ticket.date_mod) } },
    ];

    return a;
  }, [ticket, ctxShowDetail.showDetail]);

  return (
    <List.Item
      id={String(ticket.id)}
      icon={glpiIconTicketStatus[ticket.status.id]}
      title={ticket.name}
      accessories={accessory}
      keywords={keywords}
      detail={<DetailTicket ticket={ticket} />}
      actions={<ActionTicket ticket={ticket} />}
    />
  );
}

function DetailTicket({ ticket }: ListTicketsItemProps): React.JSX.Element {
  /* Team */
  const requester = React.useMemo(() => {
    return ticket.team.filter((v) => v.role === "requester");
  }, [ticket]);
  const assigned = React.useMemo(() => {
    return ticket.team.filter((v) => v.role === "assigned");
  }, [ticket]);
  const observer = React.useMemo(() => {
    return ticket.team.filter((v) => v.role === "observer");
  }, [ticket]);

  /* Dates */
  const dateMod = React.useMemo(() => {
    const date = new Date(ticket.date_mod);
    const currentDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const currentTime = date.toLocaleTimeString("en-US");
    return `${currentDate} ${currentTime}`;
  }, [ticket]);
  const dateCreation = React.useMemo(() => {
    const date = new Date(ticket.date_creation);
    const currentDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const currentTime = date.toLocaleTimeString("en-US");
    return `${currentDate} ${currentTime}`;
  }, [ticket]);
  const dateSolve = React.useMemo(() => {
    if (!ticket.date_solve) return undefined;
    const date = new Date(ticket.date_solve);
    const currentDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const currentTime = date.toLocaleTimeString("en-US");
    return `${currentDate} ${currentTime}`;
  }, [ticket]);
  const dateClose = React.useMemo(() => {
    if (!ticket.date_close) return undefined;
    const date = new Date(ticket.date_close);
    const currentDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const currentTime = date.toLocaleTimeString("en-US");
    return `${currentDate} ${currentTime}`;
  }, [ticket]);

  return (
    <List.Item.Detail
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Id" icon={Icon.Hashtag} text={String(ticket.id)} />
          <Detail.Metadata.Label title="Title" text={ticket.name} />
          <Detail.Metadata.Label
            title="Status"
            icon={glpiIconTicketStatus[ticket.status.id]}
            text={ticket.status.name}
          />
          {ticket.category?.name && (
            <Detail.Metadata.Label title="Category" icon={Icon.Tag} text={ticket.category.name} />
          )}
          <Detail.Metadata.Label title="Date Creation" icon={Icon.Plus} text={dateCreation} />
          {dateSolve && <Detail.Metadata.Label title="Date Solve" icon={Icon.Checkmark} text={dateSolve} />}
          {dateClose && <Detail.Metadata.Label title="Date Close" icon={Icon.Xmark} text={dateClose} />}
          <Detail.Metadata.Label title="Last Update" icon={Icon.Pencil} text={dateMod} />
          <Detail.Metadata.TagList title="Requester">
            {requester.map((v, i) => (
              <Detail.Metadata.TagList.Item key={i} text={v.name} icon={Icon.Person} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Assigned">
            {assigned.map((v, i) => (
              <Detail.Metadata.TagList.Item key={i} text={v.name} icon={Icon.PersonLines} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Observer">
            {observer.map((v, i) => (
              <Detail.Metadata.TagList.Item key={i} text={v.name} icon={Icon.TwoPeople} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
