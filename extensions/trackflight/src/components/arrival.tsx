import { List } from "@raycast/api";
import { Arrival } from "../responseTypes";
import { makeListDetail } from "../utils";

export default function makeArrivalData(data?: Arrival) {
  if (data == undefined) {
    return;
  }
  let airportLocationDetail = undefined;
  const airportIATACode = data.airport.iata != undefined ? data.airport.iata : "-";
  const airportLocation = data.airport.location;
  if (airportLocation != undefined) {
    const url = `https://www.google.com/maps/search/?api=1&query=${airportLocation.lat},${airportLocation.lon}&data=${airportIATACode}`;
    airportLocationDetail = (
      <List.Item.Detail.Metadata.Link title="Airport Location" target={url} text={airportIATACode} />
    );
  }

  let arrivalDate: string;
  if (data.scheduledTimeUtc != undefined) {
    arrivalDate = new Date(data.scheduledTimeUtc).toDateString();
  } else {
    arrivalDate = "";
  }

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {makeListDetail("Airport Name", data.airport.name)}
          {airportLocationDetail != undefined
            ? airportLocationDetail
            : makeListDetail("Airport IATA Code", airportIATACode)}
          <List.Item.Detail.Metadata.Separator />
          {makeListDetail("Scheduled Landing Time [Local]", data.scheduledTimeLocal, true)}
          {makeListDetail("Actual Landing Time [Local]", data.actualTimeLocal, true)}
          <List.Item.Detail.Metadata.Label title="Date" text={arrivalDate} />;
          <List.Item.Detail.Metadata.Separator />
          {makeListDetail("Terminal", data.terminal)}
          {makeListDetail("Gate", data.gate)}
          {makeListDetail("Baggage Belt", data.baggageBelt)}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Data Quality">
            {data.quality.map((item) => {
              return <List.Item.Detail.Metadata.TagList.Item text={item.toString()} />;
            })}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
