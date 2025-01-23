import { ActionPanel, List, Action, Icon, Toast, showToast, Color } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import { parseTrains } from "./api/rfi-api";
import { mapTrains, getUrl } from "./api/trains-service";
import { Train } from "./models/train";
import { Station } from "./models/station";
import { DirectionDropdown } from "./components/direction-dropdown";

function getAccessory(train: Train) {
  if (train.isBlinking) {
    return { tag: `${train.delay}`, icon: { source: Icon.Dot, tintColor: Color.Blue }, tooltip: "Departing now" };
  } else if (train.isDelayed) {
    return { tag: { value: `${train.delay}`, color: Color.Red }, tooltip: `Train delayed by ${train.delay} minutes` };
  } else {
    return {};
  }
}

export function StationView(props: { station: Station }) {
  const [direction, setDirection] = useState("false");

  const {
    isLoading: isLoading,
    data: trains,
    revalidate,
  } = useFetch(getUrl(props.station.id, direction), {
    parseResponse(response) {
      return response.text().then(parseTrains);
    },
    mapResult(result) {
      return { data: mapTrains(result) };
    },
    onError(error) {
      (async () => {
        await showToast({
          style: Toast.Style.Failure,
          title: `Could not load trains for ${props.station.name}`,
          message: error.toString(),
        });
      })();
    },
  });

  return (
    <List
      navigationTitle={`${props.station.name} station`}
      searchBarAccessory={<DirectionDropdown onSelectionChange={setDirection} />}
      isLoading={isLoading}
      isShowingDetail={!(!trains || trains.length === 0)}
    >
      {!trains || trains.length === 0 ? (
        <List.EmptyView
          title="No trains found"
          actions={
            <ActionPanel>
              <Action
                autoFocus={false}
                title="Refresh"
                onAction={revalidate}
                shortcut={{ modifiers: ["opt"], key: "l" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        trains.map((train) => (
          <List.Item
            key={train.number}
            title={train.time}
            subtitle={`${train.destination} - ${train.number}`}
            keywords={[train.number, train.destination, train.time]}
            accessories={[getAccessory(train)]}
            icon={train.icon ? `${train.icon}.svg` : Icon.Train}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title={`${train.destination} - ${train.number}`}>
                      {train.isDelayed && (
                        <List.Item.Detail.Metadata.TagList.Item text={train.delay} color={Color.Red} />
                      )}
                      {train.isBlinking && (
                        <List.Item.Detail.Metadata.TagList.Item text="Departing now" color={Color.Blue} />
                      )}
                    </List.Item.Detail.Metadata.TagList>

                    <List.Item.Detail.Metadata.Label title="Info" />
                    <List.Item.Detail.Metadata.Label title="Original time" text={train.time} />
                    <List.Item.Detail.Metadata.Label title="Platform" text={train.platform} />
                    <List.Item.Detail.Metadata.Label title="Train" text={`${train.carrier} ${train.number}`} />
                    {train.isReplacedByBus && (
                      <List.Item.Detail.Metadata.Label title="This train is replaced by a bus" />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  autoFocus={false}
                  title="Refresh"
                  onAction={revalidate}
                  shortcut={{ modifiers: ["opt"], key: "l" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
