import { Action, ActionPanel, List } from "@raycast/api";
import Config, { SpaceSQLite } from "../Config";
import { SpaceNamer } from "./SpaceNamer";
import useNamedSpaces from "../hooks/useNamedSpaces";
import { Spaces } from "../types";

type ListSpacesProps = {
  config: Config;
};

export const ListSpaces = ({ config }: ListSpacesProps) => {
  const { namedSpaces, namedSpacesLoading } = useNamedSpaces();

  return <List isLoading={namedSpacesLoading}>{config.spaces.map(mapSQLiteSpaceListItem(namedSpaces))}</List>;
};

const mapSQLiteSpaceListItem = (namedSpaces: Spaces) => (sqLiteSpace: SpaceSQLite) =>
  (
    <List.Item
      key={sqLiteSpace.spaceID}
      title={nameSpace(sqLiteSpace, namedSpaces)}
      actions={
        <ActionPanel>
          <Action.Push title="Name it" target={<SpaceNamer sqLiteSpace={sqLiteSpace} />} />
        </ActionPanel>
      }
    />
  );

const nameSpace = (sqLiteSpace: SpaceSQLite, namedSpaces: Spaces): string => {
  const known = namedSpaces.find((space) => space.id === sqLiteSpace.spaceID);

  if (known) return known.name;

  const postfix = sqLiteSpace.primary ? "(primary)" : "";

  return [sqLiteSpace.spaceID, postfix].filter((str) => str.length > 0).join(" ");
};
