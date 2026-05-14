import { ActionPanel, List, Action, Icon, Keyboard, Toast, showToast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import { parseTrains } from "./api/rfi-api";
import { mapTrains, getUrl, getContentForCopyToClipboardAction } from "./api/trains-service";
import { Train } from "./models/train";
import { Station } from "./models/station";
import { DirectionDropdown } from "./components/direction-dropdown";

function getAccessory(train: Train, icon: string) {
  const accessories = [];
  if (train.isBlinking) {
    accessories.push({
      icon: { source: icon, tintColor: Color.Blue },
      tooltip: "Departing now",
    });
  }
  if (train.isDelayed || train.isCancelled) {
    accessories.push({
      tag: { value: `${train.delay}`, color: Color.Red },
      tooltip: `Train delayed by ${train.delay} minutes`,
    });
  }
  return accessories;
}

function displayToast({
  title,
  style,
  primaryAction = undefined,
}: {
  title: string;
  style: Toast.Style;
  primaryAction?: Toast.ActionOptions;
}) {
  (async () => {
    await showToast({
      style: style,
      title: title,
      primaryAction: primaryAction,
    });
  })();
}

export function StationView(props: { station: Station }) {
  const [isArrival, setDirection] = useState("false");
  const [currentIcon, setCurrentIcon] = useState<string>("dot_left.svg");

  const {
    isLoading: isLoading,
    data: trains,
    revalidate,
  } = useFetch(getUrl(props.station.id, isArrival), {
    onWillExecute() {
      displayToast({ title: "Loading Data", style: Toast.Style.Animated });
    },
    parseResponse(response) {
      return response.text().then(parseTrains);
    },
    mapResult(result) {
      displayToast({
        title: "Trains Loaded",
        style: Toast.Style.Success,
        primaryAction: { title: "Reload", onAction: revalidate },
      });
      return { data: mapTrains(result) };
    },
    onError() {
      displayToast({
        title: "Could Not Load Information",
        style: Toast.Style.Failure,
        primaryAction: { title: "Try Again", onAction: revalidate },
      });
    },
  });

  useEffect(() => {
    const icons = ["dot_left.svg", "dot_right.svg"];
    let index = 0;

    const interval = setInterval(() => {
      index = (index + 1) % icons.length;
      setCurrentIcon(icons[index]);
    }, 450);

    return () => clearInterval(interval);
  }, []);

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
                shortcut={Keyboard.Shortcut.Common.Refresh}
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
            accessories={getAccessory(train, currentIcon)}
            icon={train.icon ? `${train.icon}.svg` : Icon.Train}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title={`${train.destination} - ${train.number}`}>
                      {(train.isDelayed || train.isCancelled) && (
                        <List.Item.Detail.Metadata.TagList.Item text={train.delay} color={Color.Red} />
                      )}
                      {train.isBlinking && (
                        <List.Item.Detail.Metadata.TagList.Item
                          text={isArrival == "true" ? "Arriving now" : "Departing now"}
                          color={Color.Blue}
                        />
                      )}
                    </List.Item.Detail.Metadata.TagList>

                    <List.Item.Detail.Metadata.Label title="Info" />
                    <List.Item.Detail.Metadata.Label
                      title={isArrival == "true" ? "Scheduled arrival" : "Scheduled departure"}
                      text={train.time}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Platform"
                      text={train.icon == "bus" ? "Bus" : train.platform}
                    />
                    <List.Item.Detail.Metadata.Label title="Train" text={`${train.carrier} ${train.number}`} />
                    {train.isReplacedByBus && (
                      <List.Item.Detail.Metadata.Label title="This train is replaced by a bus" />
                    )}
                    {train.isIncomplete && (
                      <List.Item.Detail.Metadata.Label title="⚠️ The details on this canceled train are temporarily not available (the train could be replaced by bus)." />
                    )}
                    {train.stops && train.stops.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Stops">
                        {train.stops.map((stop) => (
                          <List.Item.Detail.Metadata.TagList.Item key={stop} text={stop} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Train Info"
                  content={getContentForCopyToClipboardAction(train, isArrival == "true")}
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  autoFocus={false}
                  title="Reload"
                  onAction={revalidate}
                  icon={Icon.RotateClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
