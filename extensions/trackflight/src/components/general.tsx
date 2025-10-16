import { Color, List } from "@raycast/api";
import { Flight, FlightStatus } from "../responseTypes";
import { makeListDetail } from "../utils";

export default function makeGeneralData(data?: Flight) {
  if (data == undefined) {
    return;
  }
  const status: FlightStatus = data.status;
  let departureDate: string;
  if (data.departure.scheduledTimeUtc != undefined) {
    departureDate = new Date(data.departure.scheduledTimeUtc).toDateString();
  } else {
    departureDate = "";
  }

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {makeListDetail("Airline", data.airline?.name)}
          {makeListDetail("Flight Number", data.number)}
          <List.Item.Detail.Metadata.Label title="Date" text={departureDate} />;
          <List.Item.Detail.Metadata.Separator />
          {makeListDetail("From", data.departure.airport.iata)}
          {makeListDetail("To", data.arrival.airport.iata)}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={status} color={makeColor(status)} />
          </List.Item.Detail.Metadata.TagList>
          {makeListDetail("Last Updated", data.lastUpdatedUtc, true)}
          <List.Item.Detail.Metadata.Separator />
          {makeListDetail("Aircraft", data.aircraft?.model)}
          <List.Item.Detail.Metadata.Label title="Is Cargo Flight" text={data.isCargo ? "Yes" : "No"} />
          <List.Item.Detail.Metadata.Separator />
          {makeListDetail("Total Flight Distance [km]", data.greatCircleDistance?.km.toString())}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * Function to set text color given flight status
 * @param {FlightStatus}flightStatus given a flight status will set a color for text and icons
 * @returns {Color} returns Green, Red, Orange or Purple given the different events
 */
function makeColor(flightStatus: FlightStatus): Color {
  if (
    flightStatus == FlightStatus.Approaching ||
    flightStatus == FlightStatus.Expected ||
    flightStatus == FlightStatus.EnRoute ||
    flightStatus == FlightStatus.CheckIn ||
    flightStatus == FlightStatus.Boarding ||
    flightStatus == FlightStatus.GateClosed ||
    flightStatus == FlightStatus.Departed ||
    flightStatus == FlightStatus.Arrived
  ) {
    return Color.Green;
  } else if (
    flightStatus == FlightStatus.Canceled ||
    flightStatus == FlightStatus.CanceledUncertain ||
    flightStatus == FlightStatus.Diverted
  ) {
    return Color.Red;
  } else if (flightStatus == FlightStatus.Delayed) {
    return Color.Orange;
  } else {
    return Color.Purple;
  }
}
