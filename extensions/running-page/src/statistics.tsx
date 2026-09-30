import { Action, ActionPanel, Detail, getPreferenceValues, Grid, Icon, useNavigation } from "@raycast/api";
import { getAccessToken, useFetch, withAccessToken } from "@raycast/utils";
import { github } from "./util/auth";
import { getOwnerAndRepository } from "./util/utils";
import { useEffect, useState } from "react";
import { GitHubResource } from "./type";

function Statistics() {
  const preferences = getPreferenceValues<Preferences>();
  const repository = getOwnerAndRepository(preferences.repository);
  const { token } = getAccessToken();

  const { isLoading, data, revalidate } = useFetch<GitHubResource[]>(
    `https://api.github.com/repos/${repository.owner}/${repository.repo}/contents/assets`,
    {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github.json",
        Authorization: `Bearer ${token}`,
      },
      method: "GET",
      keepPreviousData: true,
    },
  );

  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilteredList] = useState(data);

  useEffect(() => {
    if (!data) {
      return;
    }
    setFilteredList(
      data
        .filter((item) => item.name.endsWith(".svg"))
        .filter((item) => !["start", "end"].some((s) => item.name.startsWith(s)))
        .filter((item) => item.name.includes(searchText))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, [data, searchText]);

  const { push } = useNavigation();

  const [selected, setSelected] = useState<string | null>();

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      filtering={false}
      onSearchTextChange={setSearchText}
      onSelectionChange={(e) => setSelected(e)}
      navigationTitle={selected ? selected : "Statistics"}
    >
      <Grid.Section title="Results" subtitle={`${filteredList?.length || 0}`}>
        {filteredList?.map((item) => (
          <Grid.Item
            id={item.name.slice(0, -4).replace("_", " ")}
            key={item.name}
            content={item.download_url}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Bird}
                  title="Detail"
                  onAction={() => {
                    push(<ImageDetails item={item} revalidate={revalidate} />);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}

const ImageDetails = ({ item, revalidate }: { item: GitHubResource; revalidate: () => void }) => {
  const [width, setWidth] = useState(250);

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.html_url} />
          <Action onAction={revalidate} title="Refresh" icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
      markdown={`![](${item.download_url}${item.download_url.includes("?") ? "&" : "?"}raycast-width=${width})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Zoom">
            <Detail.Metadata.TagList.Item
              color={"#eed535"}
              icon={Icon.Plus}
              onAction={() => {
                setWidth((p) => Math.min(470, p + 10));
              }}
            ></Detail.Metadata.TagList.Item>
            <Detail.Metadata.TagList.Item
              color={"#eed535"}
              icon={Icon.Minus}
              onAction={() => {
                setWidth((p) => Math.max(200, p - 10));
              }}
            ></Detail.Metadata.TagList.Item>
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
};

export default withAccessToken(github)(Statistics);
