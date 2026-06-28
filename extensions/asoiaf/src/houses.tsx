import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import useASOIAF from "./lib/useASOIAF";
import { House } from "./lib/types";
import ListItemAsTextOrIcon from "./lib/components/ListItemAsTextOrIcon";
import ListItemAsTagsOrIcon from "./lib/components/ListItemAsTagsOrIcon";

export default function Houses() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { isLoading, data: houses, pagination } = useASOIAF<House>("houses");

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      pagination={pagination}
      searchBarPlaceholder="Search house"
    >
      <List.Section title={`${houses?.length} Houses`}>
        {houses?.map((house) => (
          <List.Item
            key={house.url}
            title={house.name}
            subtitle={isShowingDetail ? undefined : house.words}
            accessories={isShowingDetail ? undefined : [{ text: house.founded }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={house.name} />
                    <ListItemAsTextOrIcon title="Region" text={house.region} />
                    <ListItemAsTextOrIcon title="Coat of Arms" text={house.coatOfArms} />
                    <ListItemAsTextOrIcon title="Words" text={house.words} />
                    <ListItemAsTagsOrIcon title="Titles" items={house.titles} />
                    <ListItemAsTagsOrIcon title="Seats" items={house.seats} />
                    <ListItemAsTextOrIcon title="Founded" text={house.founded} />
                    <List.Item.Detail.Metadata.Label title="Died Out" text={house.diedOut} />
                    <ListItemAsTagsOrIcon title="Ancestral Weapons" items={house.ancestralWeapons} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
