import { useMemo } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import proj4 from "proj4";
import InvalidCoordinates from "./InvalidCoordinates";
import { afterActionHandler } from "../helpers/actions";

interface GeodeticListProps {
  projectionType: string;
  x: string;
  y: string;
}

function coordChecker(coord: string): boolean {
  return !isNaN(Number(coord)) && coord.trim() !== "";
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

function convertToGeodetic(x: number, y: number, sourceEPSG: string): { latitude: number; longitude: number } {
  try {
    const [lon, lat] = proj4(sourceEPSG, "EPSG:4326", [x, y]);
    return { latitude: lat, longitude: lon };
  } catch (error) {
    throw new Error(`Failed to convert coordinates: ${error}`);
  }
}

export default function GeodeticList({ projectionType, x, y }: GeodeticListProps) {
  const isValidCoords = useMemo(() => {
    return [x, y].every(coordChecker);
  }, [x, y]);

  let listContent: React.ReactElement[] | React.ReactElement;

  if (isValidCoords) {
    const result = useMemo(() => {
      const xNum = parseFloat(x);
      const yNum = parseFloat(y);

      let epsgCode = "EPSG:3395";
      switch (projectionType) {
        case "mercator":
          epsgCode = "EPSG:3395";
          break;
        case "webMercator":
          epsgCode = "EPSG:3857";
          break;
        case "utm":
          epsgCode = "EPSG:32633";
          break;
        case "lambert":
          epsgCode = "EPSG:2264";
          break;
        case "albers":
          epsgCode = "EPSG:5070";
          break;
      }

      return convertToGeodetic(xNum, yNum, epsgCode);
    }, [projectionType, x, y]);

    const { latitude, longitude } = result;

    const ListItemActions = (
      <ActionPanel>
        <Action.CopyToClipboard
          content={`${longitude.toFixed(3)}, ${latitude.toFixed(3)}`}
          onCopy={afterActionHandler}
        />
      </ActionPanel>
    );

    listContent = (
      <List.Item
        title="Longitude, Latitude"
        accessories={[{ text: `${longitude.toFixed(3)}, ${latitude.toFixed(3)}` }]}
        actions={ListItemActions}
      />
    );
  } else {
    listContent = <InvalidCoordinates />;
  }

  return <List>{listContent}</List>;
}
