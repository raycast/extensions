import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Space, Spaces } from "../types";
import { makeName, teetee, wtee } from "../functions/logs";

const spacesKey = "spaces";

export default function () {
  const [namedSpaces, setNamedSpaces] = useCachedState<Spaces>(spacesKey, []);
  const [namedSpacesLoading, setNamedSpacesLoading] = useState(true);

  const getNamedSpaces = (): Promise<Spaces> =>
    makeName("getNamedSpaces")
      .then(() => LocalStorage.getItem(spacesKey))
      .then(teetee("local storage spaces"))
      .then(castToSpaces)
      .then(teetee("parsed spaces"))
      .catch(() => []);

  const loadNamedSpaces = (): Promise<void> =>
    makeName("loadNamedSpaces") // prettier-ignore
      .then(getNamedSpaces)
      .then(teetee("loaded named spaces"))
      .then(setNamedSpaces);

  const storeNamedSpaces = (spaces: Spaces): Promise<void> =>
    makeName("storeNamedSpaces")
      .then(() => JSON.stringify(spaces))
      .then(teetee("serialized spaces"))
      .then((serialized) => LocalStorage.setItem(spacesKey, serialized));

  useEffect(() => {
    makeName("useEffect useNamedSpaces")
      .then(loadNamedSpaces)
      .finally(() => setNamedSpacesLoading(false));
  }, []);

  const namedSpacesUpsert = async (namedSpace: Space): Promise<void> =>
    makeName("namedSpacesUpsert")
      .then(wtee("initial named spaces", namedSpaces))
      .then(() => namedSpaces.find((s) => s.id === namedSpace.id))
      .then(teetee("found named space"))
      .then((space) => (space ? updateNamedSpaces(namedSpaces, namedSpace) : [...namedSpaces, namedSpace]))
      .then(teetee("updated named spaces"))
      .then((spaces) => spaces.filter(onlyUnique))
      .then(teetee("unique named spaces"))
      .then((spaces) => storeNamedSpaces(spaces).then(() => setNamedSpaces(spaces)));

  return {
    namedSpacesLoading,
    namedSpaces,

    namedSpacesUpsert,
  };
}

const updateNamedSpaces = (namedSpaces: Spaces, namedSpace: Space): Spaces =>
  namedSpaces.map((space) => (space.id === namedSpace.id ? namedSpace : space));

const castToSpaces = (value: LocalStorage.Value | undefined): Spaces => {
  if (typeof value !== "string") return [];

  return JSON.parse(value) as Spaces;
};

const onlyUnique = (value: Space, index: number, self: Spaces) =>
  self.findIndex((space) => space.id === value.id) === index;
