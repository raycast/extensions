import APIData from "./algolia/apiData";
import type { IAPIData } from "./algolia/types";
import { SearchDocumentation } from "./components";

import { ActionPanel, List, Action, useNavigation, Icon } from "@raycast/api";
import { useEffect, useState } from "react";

export default function ChooseSearchDocumentation() {
  const [currentAPIData, setCurrentAPIData] = useState<IAPIData[]>(APIData);
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
      {currentAPIData?.map((API: IAPIData) => (
        <List.Item
          icon={API.icon}
          key={`${API.homepage}-${API.indexName}`}
          title={API.name}
          subtitle={API.lang}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowRight}
                title="Choose"
                onAction={() => {
                  push(<SearchDocumentation docsName={API.name} lang={API.lang} />);
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
