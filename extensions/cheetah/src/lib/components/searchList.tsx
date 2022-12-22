import { List } from "@raycast/api";
import { COMMAND } from "cheetah-core";
import { useEffect, useState } from "react";
import useInitCore from "../effects/useInitCore";
import useProjectFilter from "../effects/useProjectFilter";
import SearchListItem from "./searchListItem";

export default (command: COMMAND, appPath: string, forced = false) => {
  useInitCore();
  const [searchText, setSearchText] = useState("");
  const [data, loading, filterProject] = useProjectFilter();

  useEffect(() => {
    filterProject(searchText);
  }, [searchText]);

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your project..."
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult, index) => (
          <SearchListItem
            key={searchResult.name + index}
            searchResult={searchResult}
            appPath={appPath}
            forced={forced}
            filterProject={filterProject}
            commandType={command}
          />
        ))}
      </List.Section>
    </List>
  );
};
