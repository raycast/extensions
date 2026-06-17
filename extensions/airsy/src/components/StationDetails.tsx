import { FC } from "react";
import { List } from "@raycast/api";
import { IStationResult } from "../types";
import IndexDetails from "./IndexDetails";
import removeAccents from "remove-accents";

interface IProps {
  station: IStationResult;
}

const StationAddress: FC<IProps> = ({ station }) => {
  const city = station.city.name;

  const ad = station.city.addressName !== null ? station.city.addressName.split("/")[0] : "";
  const address = ad.replace(/ /g, "+");
  const link = `https://www.google.com/maps/place/${removeAccents(address)}+${removeAccents(city)}`;

  return (
    <>
      <List.Item.Detail.Metadata.Label title="Station address" />
      <List.Item.Detail.Metadata.Label title="City Name" text={station.city.name} />
      {station.city.addressName !== null && (
        <List.Item.Detail.Metadata.Label title="Address" text={station.city.addressName} />
      )}
      <List.Item.Detail.Metadata.Link title={""} target={link} text={"Find in Google Maps"} />
      <List.Item.Detail.Metadata.Separator />
    </>
  );
};

const StationDetails: FC<IProps> = ({ station }) => {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <StationAddress station={station} />
          <IndexDetails title="Main index" indexValue={station.index.overall} />
          <IndexDetails title="PM10" indexValue={station.index.pm10} value={station.sensor.pm10} />
          <IndexDetails title="PM25" indexValue={station.index.pm25} value={station.sensor.pm25} />
          <IndexDetails title="SO2" indexValue={station.index.so2} value={station.sensor.so2} />
          <IndexDetails title="NO2" indexValue={station.index.no2} value={station.sensor.no2} />
          <IndexDetails title="O3" indexValue={station.index.o3} value={station.sensor.o3} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};

export default StationDetails;
