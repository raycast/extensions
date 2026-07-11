import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { apiUrl, baseUrl } from "./constants/constants";
import { Document, InputDataType } from "./types/types";

interface Preferences {
  AccessToken: string;
}

export default function indexDocs() {
  const [showingDetail, setShowingDetail] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data } = useFetch<{ data: Document[] }>(
    `${apiUrl}/documents`,
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
            key={doc.uuid}
            title={`${doc.name || ""}`}
            accessories={[{ date: new Date(doc.created_at) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Show Details"
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                <Action.OpenInBrowser url={`${baseUrl}/edit-doc/${doc.uuid}`} />
              </ActionPanel>
            }
            subtitle={doc.user?.name}
            detail={
              <List.Item.Detail
                isLoading={isLoading}
                metadata={
                  <List.Item.Detail.Metadata>
                    {doc.document_version &&
                      doc.document_version?.input_data &&
                      JSON.parse(doc.document_version?.input_data)?.map(
                        (item: InputDataType) => (
                          <List.Item.Detail.Metadata.Label
                            key={Object.keys(item)[0]}
                            title={Object.keys(item)[0]}
                            text={item[Object.keys(item)[0]] || ""}
                          />
                        )
                      )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
    </List>
  );
}
