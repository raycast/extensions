import { List } from "@raycast/api";
import { Departure } from "../responseTypes";
import { makeListDetail } from "../utils";

export default function makeDepartureData(data?: Departure) {
  if (data == undefined) {
    return;
  }
  let airportLocationDetail = undefined;
  const airportName = data.airport.name;
  const airportIATACode = data.airport.iata != undefined ? data.airport.iata : "-";
  const airportLocation = data.airport.location;
  if (airportLocation != undefined) {
    const url = `https://www.google.com/maps/search/?api=1&query=${airportLocation.lat},${airportLocation.lon}&data=${airportIATACode}`;
    airportLocationDetail = (
      <List.Item.Detail.Metadata.Link title="Airport Location" target={url} text={airportIATACode} />
    );
  }

  const scheduledTimeLocal = data.scheduledTimeLocal;
  let departureDate: string;
  if (data.scheduledTimeUtc != undefined) {
    departureDate = new Date(data.scheduledTimeUtc).toDateString();
  } else {
    departureDate = "";
  }

  const terminal = data.terminal;
  const checkinDesk = data.checkInDesk;
  const gate = data.gate;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {makeListDetail("Airport Name", airportName)}
          {airportLocationDetail != undefined
            ? airportLocationDetail
            : makeListDetail("Airport IATA Code", airportIATACode)}
          <List.Item.Detail.Metadata.Separator />
          {makeListDetail("Scheduled Take-Off Time [Local]", scheduledTimeLocal, true)}
          {makeListDetail("Acual Take-Off Time [Local]", data.actualTimeLocal, true)}
          <List.Item.Detail.Metadata.Label title="Date" text={departureDate} />;
          <List.Item.Detail.Metadata.Separator />
          {makeListDetail("Terminal", terminal)}
          {makeListDetail("Check-In Desk", checkinDesk)}
          {makeListDetail("Gate", gate)}
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
