import { useMemo } from "react";
import { encode } from "ngeohash";
import { List, ActionPanel, CopyToClipboardAction, OpenInBrowserAction } from "@raycast/api";
import is from "@sindresorhus/is";
import InvalidCoordinates from "./InvalidCoordinates";
import { getGeohashShapeLink } from "../helpers/getGeohashLink";
import { afterActionHandler } from "../helpers/actions";

interface EncodeListProps {
  latitude: string;
  longitude: string;
}

function range(arrLength: number): number[] {
  return Array.from(new Array(arrLength), (_, i) => i + 1);
}

function coordChecker(coord: string): boolean {
  if (is.numericString(coord)) {
    const asNum = Number(coord);

    return asNum <= 180 && asNum >= -180;
  } else {
    return false;
  }
}

export default function EncodedList({ latitude, longitude }: EncodeListProps) {
  const precisions = range(12);

  const isValidCoords = useMemo(() => {
    return [latitude, longitude].every(coordChecker);
  }, [latitude, longitude]);

  let listContent: JSX.Element[] | JSX.Element;

  if (isValidCoords) {
    const asGeohash: string[] = useMemo(() => {
      return precisions.map((precision) => encode(latitude, longitude, precision));
    }, [latitude, longitude]);

    listContent = asGeohash.map((geohash) => {
      const ListItemActions = (
        <ActionPanel>
          <CopyToClipboardAction content={geohash} onCopy={afterActionHandler} />
          <OpenInBrowserAction url={getGeohashShapeLink(geohash)} onOpen={afterActionHandler} />
        </ActionPanel>
      );

      return (
        <List.Item
          title={geohash}
          accessoryTitle={`Precision ${geohash.length}`}
          key={geohash}
          actions={ListItemActions}
        />
      );
    });
  } else {
    listContent = <InvalidCoordinates />;
  }

  return <List>{listContent}</List>;
}
