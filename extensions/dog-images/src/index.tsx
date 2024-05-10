import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { breeds } from "./breeds";

export interface State {
  message: string;
  status: string;
}

export default () => {
  const [breed, setBreed] = useState("random");

  const apiUrl =
    breed && breed !== "random"
      ? `https://dog.ceo/api/breed/${breed}/images/random`
      : "https://dog.ceo/api/breeds/image/random";
  const { isLoading, data, revalidate } = useFetch<State>(apiUrl);

  const md = !isLoading && data?.message ? `![](${data.message}?raycast-height=325)` : "# Loading...";

  const setMarkDown = (id: string) => {
    setBreed((prevValue) => id || prevValue);
    revalidate();
  };

  return (
    <List
      isShowingDetail={true}
      searchBarPlaceholder="Search breeds..."
      onSelectionChange={(id: string | null) => setMarkDown(id || "")}
      isLoading={isLoading}
    >
      <List.Item
        id="random"
        title="Random"
        detail={<List.Item.Detail markdown={md} />}
        actions={
          <ActionPanel>
            <Action title="New Image" onAction={revalidate} icon={Icon.Image} />
            <Action.CopyToClipboard
              title="Copy URL to Clipboard"
              content={data ? data.message : ""}
              icon={Icon.CopyClipboard}
            />
          </ActionPanel>
        }
      />
      {breeds.map(({ id, name }) => (
        <List.Item
          key={id}
          id={id}
          title={name}
          detail={<List.Item.Detail markdown={md} />}
          actions={
            <ActionPanel>
              <Action title="New Image" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
