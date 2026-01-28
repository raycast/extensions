import { useMemo } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import proj4 from "proj4";
import InvalidCoordinates from "./InvalidCoordinates";
import { afterActionHandler } from "../helpers/actions";

interface ProjectedListProps {
  longitude: string;
  latitude: string;
}

function isValidNumber(coord: string): boolean {
  return !isNaN(Number(coord)) && coord.trim() !== "";
}

function isValidLongitude(longitude: string): boolean {
  if (!isValidNumber(longitude)) return false;
  const value = Number(longitude);
  return value >= -180 && value <= 180;
}

function isValidLatitude(latitude: string): boolean {
  if (!isValidNumber(latitude)) return false;
  const value = Number(latitude);
  return value >= -90 && value <= 90;
}

// Define common coordinate systems
proj4.defs([
  // WGS84 Geodetic
  ["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
  // World Mercator
  ["EPSG:3395", "+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"],
  // Pseudo Mercator
  [
    "EPSG:3857",
    "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs",
  ],
  // UTM Zone 33N
  ["EPSG:32633", "+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs"],
  // Lambert Conic Conformal
  [
    "EPSG:2264",
    "+proj=lcc +lat_1=36.16666666666666 +lat_2=34.33333333333334 +lat_0=33.75 +lon_0=-79 +x_0=609601.22 +y_0=0 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs",
  ],
  // Conus Albers
  ["EPSG:5070", "+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs"],
]);

function convertCoordinates(lat: number, lon: number, targetEPSG: string): { x: number; y: number } {
  const [x, y] = proj4("EPSG:4326", targetEPSG, [lon, lat]);
  return { x, y };
}

export default function ProjectedList({ longitude, latitude }: ProjectedListProps) {
  const isValidCoords = useMemo(() => {
    return isValidLatitude(latitude) && isValidLongitude(longitude);
  }, [latitude, longitude]);

  let listContent: React.ReactElement[] | React.ReactElement;

  if (isValidCoords) {
    const coordinateSystems = useMemo(() => {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      const mercator = convertCoordinates(lat, lng, "EPSG:3395");
      const webMercator = convertCoordinates(lat, lng, "EPSG:3857");
      const utm = convertCoordinates(lat, lng, "EPSG:32633");
      const lambert = convertCoordinates(lat, lng, "EPSG:2264");
      const albers = convertCoordinates(lat, lng, "EPSG:5070");

      return {
        mercator,
        webMercator,
        utm,
        lambert,
        albers,
      };
    }, [latitude, longitude]);

    const { mercator, webMercator, utm, lambert, albers } = coordinateSystems;

    const coordinateItems = [
      {
        title: "World Mercator",
        value: `${mercator.x.toFixed(3)}, ${mercator.y.toFixed(3)}`,
        key: "world mercator",
      },
      {
        title: "Pseudo Mercator",
        value: `${webMercator.x.toFixed(3)}, ${webMercator.y.toFixed(3)}`,
        key: "pseudo mercator",
      },
      {
        title: "UTM Zone 33N",
        value: `${utm.x.toFixed(3)}, ${utm.y.toFixed(3)}`,
        key: "utm zone 33n",
      },
      {
        title: "Lambert Conic Conformal",
        value: `${lambert.x.toFixed(3)}, ${lambert.y.toFixed(3)}`,
        key: "lambert conic conformal",
      },
      {
        title: "Conus Albers",
        value: `${albers.x.toFixed(3)}, ${albers.y.toFixed(3)}`,
        key: "conus albers",
      },
    ];

    listContent = coordinateItems.map((item) => {
      const ListItemActions = (
        <ActionPanel>
          <Action.CopyToClipboard content={item.value} onCopy={afterActionHandler} />
        </ActionPanel>
      );

      return (
        <List.Item title={item.title} accessories={[{ text: item.value }]} key={item.key} actions={ListItemActions} />
      );
    });
  } else {
    listContent = <InvalidCoordinates />;
  }

  return <List>{listContent}</List>;
}
