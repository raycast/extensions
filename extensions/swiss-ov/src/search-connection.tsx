import { Form, ActionPanel, Action } from "@raycast/api";
import { useNavigation } from "@raycast/api";
import { Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ConnectionRequirement, OVConnection } from "./types";
import moment = require("moment");
import { useHistory } from "./hooks/useHistory";

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
  return <ConnectionForm />;
}

export function ConnectionForm(requirement: { value?: ConnectionRequirement }) {
  const { push } = useNavigation();
  const { addHistory } = useHistory();
  function handleSubmit(values: ConnectionRequirement) {
    push(<Connections {...values} />);
    addHistory({ timestamp: new Date().getTime(), connection: values });
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
      <Form.TextField
        id="from"
        title="From"
        placeholder="From"
        defaultValue={requirement.value?.from ? requirement.value?.from : undefined}
        storeValue={requirement.value?.from === undefined}
      />
      <Form.TextField
        id="to"
        title="To"
        placeholder="To"
        defaultValue={requirement.value?.to ? requirement.value?.to : undefined}
        storeValue={requirement.value?.to === undefined}
      />
      <Form.Checkbox
        id="isArrival"
        title="Is Arrival"
        label=""
        defaultValue={requirement.value?.isArrival ? requirement.value?.isArrival : undefined}
        storeValue={requirement.value?.isArrival === undefined}
      />
      <Form.DatePicker
        id="date"
        title="Date"
        defaultValue={
          requirement.value?.date && requirement.value?.isArrival
            ? new Date(requirement.value?.date || new Date())
            : new Date()
        }
        storeValue={requirement.value?.date === undefined}
      />
    </Form>
  );
}

function Connections(values: ConnectionRequirement) {
  const dateFormat = "HH:mm,  DD.MM.YYYY";

  const { isLoading, data } = useFetch<{ connections: OVConnection[] }>(
    `http://transport.opendata.ch/v1/connections?from=${values.from}&to=${values.to}&isArrivalTime=${values.isArrival ? 1 : 0}&time=${values.date?.toISOString()}`,
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
