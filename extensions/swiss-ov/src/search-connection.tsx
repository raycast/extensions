import { Form, ActionPanel, Action } from "@raycast/api";
import { useNavigation } from "@raycast/api";
import { Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import moment = require("moment");

type Values = {
  from: string;
  to: string;
  isArrival: boolean;
  date: Date;
};

type OVConnection = {
  transfers: string;
  duration: string;
  from: {
    departureTimestamp: string;
    station: { name: string };
    departure: string;
    platform?: string;
  };
  to: {
    arrival: string;
    arrivalTimestamp: string;
    station: { name: string };
  };
  products: string[];
  sections: [
    {
      departure: { station: { name: string }; departure: string; platform?: string };
      arrival: { station: { name: string }; arrival: string; platform?: string };
    },
  ];
};

function getConnectioMarkdown(connection: OVConnection): string {
  const dateFormat = "HH:mm,  DD.MM.YYYY";
  return `# ${connection.from.station.name} to ${connection.to.station.name}
Departure: ${moment(connection.from.departure).format(dateFormat)} 

(in ${moment.duration(moment(connection.from.departure).diff(new Date())).humanize()}),

Plattform: ${connection.from.platform || "unknown"}

${connection.products.join(", ")}  

${
  connection.sections.length <= 1
    ? ""
    : connection.sections
        .map(
          (section) =>
            `## from ${section.departure.station.name} to ${section.arrival.station.name}

Departure: ${moment(section.departure.departure).format(dateFormat)}, Plattform ${section.departure.platform || "unknown"}

Arrival: ${moment(section.arrival.arrival).format(dateFormat)}, Plattform ${section.arrival.platform || "unknown"}

`,
        )
        .join("\n")
}
`;
}

export default function Command() {
  const { push } = useNavigation();
  function handleSubmit(values: Values) {
    push(<Connections {...values} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={"Swiss Public Transport Connection"} />
      <Form.TextField id="from" title="From" placeholder="From" storeValue />
      <Form.TextField id="to" title="To" placeholder="To" storeValue />
      <Form.Checkbox id="isArrival" title="Ankunft" label="" storeValue />
      <Form.DatePicker id="date" title="Date" defaultValue={new Date()} />
    </Form>
  );
}

function Connections(values: Values) {
  const dateFormat = "HH:mm,  DD.MM.YYYY";

  const { isLoading, data } = useFetch<{ connections: OVConnection[] }>(
    `http://transport.opendata.ch/v1/connections?from=${values.from}&to=${values.to}&isArrivalTime=${values.isArrival ? 1 : 0}&time=${values.date.toISOString()}`,
  );
  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      {data &&
        data.connections.map((connection) => (
          <List.Item
            key={`${connection.from.departureTimestamp} ${connection.to.arrivalTimestamp} ${connection.from.station.name} ${connection.from.platform}`}
            title={`${connection.products.join(", ")}`}
            subtitle={`In ${moment.duration(moment(connection.from.departure).diff(new Date())).humanize()}`}
            detail={
              <List.Item.Detail
                markdown={getConnectioMarkdown(connection)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Platform" text={`${connection.from.platform}`} />
                    <List.Item.Detail.Metadata.Label
                      title="Departure"
                      icon={{ source: Icon.Clock, tintColor: Color.Green }}
                      text={{ color: Color.Green, value: `${moment(connection.from.departure).format(dateFormat)}` }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Arrival"
                      text={`${moment(connection.to.arrival).format(dateFormat)}`}
                    />
                    <List.Item.Detail.Metadata.Label title="Duration" text={`${connection.duration}`} />
                    <List.Item.Detail.Metadata.Label title="Transfer" text={`${connection.transfers}`} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
    </List>
  );
}
