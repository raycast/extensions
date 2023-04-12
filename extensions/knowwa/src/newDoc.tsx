import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { apiUrl } from "./constants/constants";
import NewDocForm from "./modules/NewDoc/NewDocForm";
import { Document } from "./types/types";

interface Preferences {
  AccessToken: string;
}

export default function newDoc() {
  const [showingDetail, setShowingDetail] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data } = useFetch<{ data: Document[] }>(
    `${apiUrl}/templates`,
    {
      headers: {
        Authorization: `Bearer ${preferences["AccessToken"]}`,
        accept: "application/json ",
      },
    }
  );

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {data &&
        data.data?.map((doc: Document) => (
          <List.Item
            key={doc.id}
            title={`${doc.name || ""}`}
            actions={
              <ActionPanel>
                <Action
                  title="Show Details"
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action.Push
                  target={<NewDocForm template={doc} />}
                  title="Go to Form"
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                isLoading={isLoading}
                metadata={
                  <List.Item.Detail.Metadata>
                    {doc.checklist_items.map((item) => (
                      <List.Item.Detail.Metadata.Label
                        title={item.identifier}
                        key={item.identifier}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
    </List>
  );
}
