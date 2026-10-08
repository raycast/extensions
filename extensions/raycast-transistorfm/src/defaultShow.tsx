import { useState } from "react";

import { Action, ActionPanel, Detail, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";

import mappings from "./components/showMetadata/mappings";
import IShows from "./interfaces/shows";
import HTTPRequest from "./utils/request";

export default function DefaultShowCommand() {
  const [defaultShow, setDefaultShow] = useState<string | undefined>();
  const [defaultShowTitle, setDefaultShowTitle] = useState<string | undefined>();

  // Function to set the default show
  async function setDefaultShowMethod(slug: string, title: string) {
    setDefaultShow(slug);
    setDefaultShowTitle(title);
    await LocalStorage.setItem("defaultShowSlug", slug);
    await LocalStorage.setItem("defaultShowTitle", title);
  }

  const { data, isLoading, error } = HTTPRequest({
    url: "/shows",
  }) as {
    data: IShows | undefined;
    isLoading: boolean;
    error: { title: string; message: string; markdown: string } | undefined;
  };

  const showData = data?.data;

  if (showData) {
    return (
      <List isLoading={!defaultShow || !defaultShowTitle || isLoading}>
        {showData &&
          !isLoading &&
          showData.map((show) => {
            return (
              <List.Item
                key={show.attributes.slug}
                icon={mappings.imageUrl(show).value || Icon.Bolt}
                title={mappings.title(show).value!}
                subtitle={mappings.description(show).value}
                accessories={[
                  { text: mappings.createdAt(show).value },
                  { icon: Icon.Dot },
                  { text: mappings.author(show).value, icon: Icon.PersonCircle },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Set Default for Menu Bar"
                      onAction={() => {
                        setDefaultShowMethod(show.attributes.slug, show.attributes.title);
                      }}
                    />
                  </ActionPanel>
                }
              ></List.Item>
            );
          })}
      </List>
    );
  } else if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: error.title,
      message: error.message,
    });

    return <Detail markdown={error.markdown} />;
  }
}
