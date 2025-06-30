import { List } from "@raycast/api";
import { decode, neighbors } from "ngeohash";
import { geohashToPolygonGeometry } from "geohash-to-geojson";
import { convertToWK } from "wkt-parser-helper";
import { useMemo } from "react";
import ListRow from "./ListRow";
import InvalidGeohash from "./InvalidGeohash";
import is from "@sindresorhus/is";
import { getLatLonLink, getGeohashShapeLink } from "../helpers/getGeohashLink";

interface GeohashInfoProps {
  geohash: string;
}

const validChars = "0123456789bcdefghjkmnpqrstuvwxyz";

function checkValidLetter(letter: string): boolean {
  return validChars.includes(letter);
}

export default function DecodedInfo({ geohash }: GeohashInfoProps) {
  const isValidGeohash = useMemo(() => {
    return !is.emptyString(geohash) && geohash.split("").every(checkValidLetter);
  }, [geohash]);

  if (isValidGeohash) {
    const { latitude, longitude, centroidWKT, neighborsList, polygonGeoJSON, polygonWKT, centroidLink, shapeLink } =
      useMemo(() => {
        const { latitude, longitude } = decode(geohash);
        const polygonGeoJSON = geohashToPolygonGeometry(geohash);

        return {
          latitude,
          longitude,
          centroidWKT: `POINT (${longitude} ${latitude})`,
          neighborsList: neighbors(geohash),
          polygonGeoJSON,
          polygonWKT: convertToWK(polygonGeoJSON),
          shapeLink: getGeohashShapeLink(geohash),
          centroidLink: getLatLonLink(latitude, longitude),
        };
      }, [geohash]);

    return (
      <List>
        <List.Section title="Base Info">
          <ListRow title="Geohash" value={geohash} link={shapeLink} />
          <ListRow title="Precision" value={geohash.length.toString()} />
          <ListRow title="Neighbors" value={neighborsList.toString()} />
        </List.Section>
        <List.Section title="Position">
          <ListRow title="Latitude" value={latitude.toString()} />
          <ListRow title="Longitude" value={longitude.toString()} />
          <ListRow title="Centroid (WKT)" value={centroidWKT} link={centroidLink} />
        </List.Section>
        <List.Section title="Shape">
          <ListRow title="Polygon shape (GeoJSON)" value={JSON.stringify(polygonGeoJSON)} link={shapeLink} />
          <ListRow title="Polygon shape (WKT)" value={polygonWKT} link={shapeLink} />
        </List.Section>
      </List>
    );
  } else {
    return (
      <List>
        <InvalidGeohash />
      </List>
    );
  }
}
