import {
  ActionPanel,
  ActionPanelItem,
  Color,
  CopyToClipboardAction,
  Icon,
  List,
  popToRoot,
  PushAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { State } from "./haapi";
import { useState, useEffect } from "react";
import { createHomeAssistantClient } from "./common";
import { EntityAttributesList } from "./components/attributes";

export const ha = createHomeAssistantClient();

export function ShowAttributesAction(props: { state: State }) {
  if (props.state.attributes) {
    return (
      <PushAction
        title="Show Attributes"
        target={<EntityAttributesList state={props.state} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      />
    );
  } else {
    return null;
  }
}

export function StatesList(props: { domain: string }) {
  const [searchText, setSearchText] = useState<string>();
  const { states, error, isLoading } = useSearch(searchText, props.domain);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Home Assistant states", error);
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {states?.map((state) => (
        <List.Item
          key={state.entity_id}
          title={state.attributes.friendly_name || state.entity_id}
          subtitle={state.entity_id}
          accessoryTitle={state.state}
          actions={<StateActionPanel state={state} />}
        />
      ))}
    </List>
  );
}

export function StateActionPanel(props: { state: State }) {
  const state = props.state;
  const domain = props.state.entity_id.split(".")[0];
  const entityID = props.state.entity_id;
  switch (domain) {
    case "cover": {
      return (
        <ActionPanel>
          <ActionPanel.Item
            title="Toggle"
            onAction={async () => await ha.toggleCover(props.state.entity_id)}
            icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Open"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={async () => await ha.openCover(props.state.entity_id)}
            icon={{ source: Icon.ChevronUp, tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Close"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => await ha.closeCover(props.state.entity_id)}
            icon={{ source: Icon.ChevronDown, tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Stop"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => await ha.stopCover(props.state.entity_id)}
            icon={{ source: Icon.XmarkCircle, tintColor: Color.PrimaryText }}
          />
          <ShowAttributesAction state={props.state} />
          <CopyToClipboardAction title="Copy value" content={props.state.state} />
        </ActionPanel>
      );
    }
    case "light": {
      return (
        <ActionPanel>
          <ActionPanel.Item
            title="Toggle"
            onAction={async () => await ha.toggleLight(props.state.entity_id)}
            icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Turn On"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={async () => await ha.turnOnLight(props.state.entity_id)}
            icon={{ source: "power.png", tintColor: Color.Green }}
          />
          <ActionPanel.Item
            title="Turn Off"
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={async () => await ha.turnOffLight(props.state.entity_id)}
            icon={{ source: "power.png", tintColor: Color.Red }}
          />
          <ShowAttributesAction state={props.state} />
          <CopyToClipboardAction title="Copy value" content={props.state.state} />
        </ActionPanel>
      );
    }
    case "media_player": {
      return (
        <ActionPanel>
          <ActionPanel.Item
            title="Play/Pause"
            onAction={async () => await ha.playPauseMedia(entityID)}
            icon={{ source: "play-pause.jpg", tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Play"
            onAction={async () => await ha.playMedia(entityID)}
            icon={{ source: "play.png", tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Pause"
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={async () => await ha.pauseMedia(entityID)}
            icon={{ source: "pause.png", tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Stop"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => await ha.stopMedia(entityID)}
            icon={{ source: Icon.XmarkCircle, tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Next"
            shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
            onAction={async () => await ha.nextMedia(entityID)}
            icon={{ source: "next.png", tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Previous"
            shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            onAction={async () => await ha.previousMedia(entityID)}
            icon={{ source: "previous.png", tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Volume Up"
            shortcut={{ modifiers: ["cmd"], key: "+" }}
            onAction={async () => await ha.volumeUpMedia(entityID)}
            icon={{ source: Icon.SpeakerArrowUp, tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Volume Down"
            shortcut={{ modifiers: ["cmd"], key: "-" }}
            onAction={async () => await ha.volumeDownMedia(entityID)}
            icon={{ source: Icon.SpeakerArrowDown, tintColor: Color.PrimaryText }}
          />
          <ActionPanel.Item
            title="Mute"
            onAction={async () => await ha.muteMedia(entityID)}
            icon={{ source: Icon.SpeakerSlash, tintColor: Color.PrimaryText }}
          />
          <ShowAttributesAction state={props.state} />
          <CopyToClipboardAction title="Copy ID" content={entityID} />
          <CopyToClipboardAction title="Copy State Value" content={props.state.state} />
        </ActionPanel>
      );
    }
    case "climate": {
      const changeTempAllowed =
        state.state === "heat" || state.state === "cool" || state.state == "auto" ? true : false;
      const currentTempValue: number | undefined = state.attributes.temperature || undefined;
      const [currentTemp, setCurrentTemp] = useState<number | undefined>(currentTempValue);
      const upperTemp = currentTemp ? currentTemp + 0.5 : undefined;
      const lowerTemp = currentTemp ? currentTemp - 0.5 : undefined;

      let temps: number[] = [];
      for (let i = 26; i > 16; i--) {
        temps.push(i);
      }

      const currentPresetMode = state.attributes.preset_mode ? state.attributes.preset_mode : "None";
      const preset_modes = state.attributes.preset_modes;

      return (
        <ActionPanel>
          {changeTempAllowed && (
            <ActionPanel.Submenu
              title={`Temperature (${currentTemp || "?"})`}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              icon={{ source: "thermometer.png", tintColor: Color.PrimaryText }}
            >
              {temps.map((t) => (
                <ActionPanelItem
                  key={t.toString()}
                  title={t.toString()}
                  onAction={async () => {
                    await ha.setClimateTemperature(entityID, t);
                    setCurrentTemp(t);
                  }}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          {state.attributes.hvac_modes && (
            <ActionPanel.Submenu
              title={`Operation (${state.state})`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              icon={{ source: Icon.Gear, tintColor: Color.PrimaryText }}
            >
              {state.attributes.hvac_modes?.map((o: string) => (
                <ActionPanelItem
                  key={o}
                  title={o}
                  onAction={async () => {
                    await ha.setClimateOperation(entityID, o);
                    popToRoot();
                  }}
                />
              ))}
            </ActionPanel.Submenu>
          )}

          {preset_modes && (
            <ActionPanel.Submenu
              title={`Preset (${currentPresetMode})`}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
            >
              {preset_modes?.map((o: string) => (
                <ActionPanelItem
                  key={o}
                  title={o}
                  onAction={async () => {
                    await ha.setClimatePreset(entityID, o);
                    popToRoot();
                  }}
                />
              ))}
            </ActionPanel.Submenu>
          )}

          {upperTemp && changeTempAllowed && (
            <ActionPanel.Item
              title={`Increase Temp. 0.5`}
              shortcut={{ modifiers: ["cmd"], key: "+" }}
              onAction={async () => {
                await ha.setClimateTemperature(entityID, upperTemp);
                setCurrentTemp(upperTemp);
              }}
              icon={{ source: "plus.png", tintColor: Color.PrimaryText }}
            />
          )}
          {lowerTemp && changeTempAllowed && (
            <ActionPanel.Item
              title={`Decrease Temp. 0.5`}
              shortcut={{ modifiers: ["cmd"], key: "-" }}
              onAction={async () => {
                await ha.setClimateTemperature(entityID, lowerTemp);
                setCurrentTemp(lowerTemp);
              }}
              icon={{ source: "minus.png", tintColor: Color.PrimaryText }}
            />
          )}
          <ShowAttributesAction state={props.state} />
          <CopyToClipboardAction title="Copy ID" content={entityID} />
          <CopyToClipboardAction title="Copy State Value" content={state.state} />
        </ActionPanel>
      );
    }
    default: {
      return <ActionPanel></ActionPanel>;
    }
  }
}

export function useSearch(
  query: string | undefined,
  domain: string
): {
  states?: State[];
  error?: string;
  isLoading: boolean;
} {
  const [states, setStates] = useState<State[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const haStates = await ha.getStates({ domain: domain, query: query || "" });

        if (!cancel) {
          setStates(haStates);
        }
      } catch (e: any) {
        if (!cancel) {
          setError(e.toString());
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { states, error, isLoading };
}
