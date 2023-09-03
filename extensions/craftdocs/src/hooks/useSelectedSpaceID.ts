import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { makeName, teetee, wtee } from "../functions/logs";

const selectedSpaceIDKey = "selectedSpaceID";

export default function () {
  const [selectedSpaceID, setSelectedSpaceID] = useState<string | undefined>(undefined);
  const [selectedSpaceIDLoading, setSelectedSpaceIDLoading] = useState(true);

  const getSelectedSpaceID = (): Promise<string | undefined> =>
    makeName("func getSelectedSpaceID")
      .then(() => LocalStorage.getItem(selectedSpaceIDKey))
      .then(teetee(`localStorage item ${selectedSpaceIDKey}`))
      .then(castSelectedSpaceID)
      .then(teetee(`localStorage casted item ${selectedSpaceIDKey}`));

  const loadSelectedSpaceID = () =>
    makeName("func loadSelectedSpaceID") // prettier-ignore
      .then(getSelectedSpaceID)
      .then(setSelectedSpaceID);

  useEffect(() => {
    makeName("useEffect useSelectedSpaceID")
      .then(loadSelectedSpaceID)
      .finally(() => setSelectedSpaceIDLoading(false));
  }, []);

  const saveSelectedSpaceID = (spaceID: string): Promise<void> =>
    makeName("func saveSelectedSpaceID")
      .then(wtee("spaceID", spaceID))
      .then(() => LocalStorage.setItem(selectedSpaceIDKey, spaceID))
      .then(() => setSelectedSpaceID(spaceID));

  return {
    selectedSpaceIDLoading,
    selectedSpaceID,

    saveSelectedSpaceID,
  };
}

const castSelectedSpaceID = (value: LocalStorage.Value | undefined): string | undefined => {
  if (typeof value !== "string") return undefined;
  if (value.length === 0) return undefined;

  return value;
};
