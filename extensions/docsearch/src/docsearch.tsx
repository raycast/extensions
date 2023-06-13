import APIData from "./data/apis";
import type { API } from "./types";
import { SearchDocumentation } from "./components";

import { ActionPanel, List, Action, useNavigation, Icon } from "@raycast/api";
import { useEffect, useState } from "react";

export default function ChooseSearchDocumentation() {
  const [currentAPIData, setCurrentAPIData] = useState<API[]>(APIData);
  const { push } = useNavigation();

  useEffect(() => {
    (() => setCurrentAPIData(APIData.filter((api) => api.name.toLowerCase().includes(""))))();
  }, []);

  return (
    <List
      throttle={true}
      navigationTitle="Documentations"
      searchBarPlaceholder="Choose a documentation"
      onSearchTextChange={(query) =>
        query
          ? setCurrentAPIData(APIData.filter((api) => api.name.toLowerCase().includes(query.toLowerCase())))
          : setCurrentAPIData(APIData)
      }
    >
      {currentAPIData?.map((API: API) => (
        <List.Item
          icon={API.icon}
          key={`${API.homepage}-${API.indexName}`}
          title={API.name}
          subtitle={"lang" in API ? API.lang : ""}
          actions={
            <ActionPanel>
              <Action
                title="Choose"
                icon={Icon.ArrowRight}
                onAction={() => {
                  push(<SearchDocumentation id={API.id} />);
                }}
              />
              <Action.OpenInBrowser url={API.homepage} title="Open in Browser" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
