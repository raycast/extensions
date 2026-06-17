import { List } from "@raycast/api";
import { COMMAND, HOME_PATH } from "cheetah-core";
import { ResultItem } from "../types";
import Actions from "./actions";

export default ({
  searchResult,
  appPath,
  forced,
  commandType,
  filterProject,
}: {
  searchResult: ResultItem;
  appPath: string;
  forced: boolean;
  commandType: COMMAND;
  filterProject: (keyword: string) => Promise<void>;
}) => {
  const finalAppPath =
    (forced ? appPath : searchResult.idePath || appPath) || "Finder";

  return (
    <List.Item
      title={searchResult.name}
      subtitle={
        searchResult.path?.replace(HOME_PATH, "~") || searchResult.description
      }
      accessoryTitle={searchResult.hits}
      icon={searchResult.icon}
      actions={
        <Actions
          searchResult={searchResult}
          finalAppPath={finalAppPath}
          filterProject={filterProject}
          commandType={commandType}
        />
      }
    />
  );
};
