/* eslint-disable @typescript-eslint/no-explicit-any */
import { useFetch } from "@raycast/utils";
import { CODEFORCES_API_BASE, CODEFORCES_BASE } from "../constants";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getColorHexCode } from "../func/HexCode";
import { ContestSubmissions } from "./ContestSubmissions";

export function Contest(value: { value: { value: any; }; }) {
  const userHandle = value.value.value;
  const { isLoading, data, error } = useFetch(`${CODEFORCES_API_BASE}user.rating?handle=${userHandle}`, {
    keepPreviousData: true,
  });

  interface ContestDetails {
    contestId: number;
    contestName: string;
    handle: string;
    rank: number;
    ratingUpdateTimeSeconds: number;
    oldRating: number;
    newRating: number;
  }

  const emptyContestDetails = {
    contestId: 0,
    contestName: "",
    handle: "",
    rank: 0,
    ratingUpdateTimeSeconds: 0,
    oldRating: 0,
    newRating: 0,
  };


  if (error) {
    console.log(`Error while fetching constests: \n ${error}`);
  }

  useEffect(() => {
    if (!isLoading) {
      setItems((data as any).result);
      filterList((data as any).result);
    }
  }, [isLoading]);

  const [items, setItems] = useState<ContestDetails[]>([emptyContestDetails]);
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState<ContestDetails[]>([]);

  useEffect(() => {
    filterList(items.filter((item) => item.contestName.includes(searchText)));
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Contest"
      searchBarPlaceholder="Search Contest By Name or Number"
      isShowingDetail
    >
      {filteredList.reverse().map((item) => (
        <List.Item
          key={item.contestId}
          title={item.contestName}
          actions={
            <ActionPanel title="Participated Contests">
              <Action.Push
                title="Get Submissions Details"
                icon={Icon.List}
                target={<ContestSubmissions id={item.contestId} handle={userHandle} />}
              />
              <Action.OpenInBrowser url={`${CODEFORCES_BASE}contest/${item.contestId}`} />
            </ActionPanel>
          }
          subtitle={`${item.contestId}`}
          detail={
            <List.Item.Detail
              markdown={`# ${item.contestName}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Rank" text={`${item.rank}`} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Old Rating">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={`${item.oldRating}`}
                      color={getColorHexCode(item.oldRating)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="New Rating">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={`${item.newRating}`}
                      color={getColorHexCode(item.newRating)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Delta">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={`${item.newRating - item.oldRating > 0 ? "+" : "-"}${Math.abs(
                        item.newRating - item.oldRating,
                      )}`}
                      color={item.newRating - item.oldRating >= 0 ? Color.Green : Color.Red}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Rating Last Updated"
                    text={`${new Date(item.ratingUpdateTimeSeconds * 1000).toLocaleString("en-US", {
                      weekday: "short",
                    })} ${new Date(item.ratingUpdateTimeSeconds * 1000).toLocaleDateString()} ${new Date(
                      item.ratingUpdateTimeSeconds * 1000,
                    ).toLocaleTimeString()}`}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
