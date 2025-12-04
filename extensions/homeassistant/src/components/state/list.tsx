import { AutomationActionPanel } from "@components/automation/actions";
import { ButtonActionPanel } from "@components/button/actions";
import { CameraActionPanel } from "@components/camera/actions";
import { ClimateActionPanel } from "@components/climate/actions";
import { CoverActionPanel } from "@components/cover/actions";
import { EntityStandardActionSections } from "@components/entity";
import { FanActionPanel } from "@components/fan/actions";
import { useHAStates } from "@components/hooks";
import { InputBooleanActionPanel } from "@components/input_boolean/actions";
import { InputButtonActionPanel } from "@components/input_button/actions";
import { InputDateTimeActionPanel } from "@components/input_datetime/actions";
import { InputNumberActionPanel } from "@components/input_number/actions";
import { InputSelectActionPanel } from "@components/input_select/actions";
import { InputTextActionPanel } from "@components/input_text/actions";
import { LightActionPanel } from "@components/light/actions";
import { MediaPlayerActionPanel } from "@components/mediaplayer/actions";
import { getMediaPlayerTitleAndArtist } from "@components/mediaplayer/utils";
import { PersonActionPanel } from "@components/person/actions";
import { SceneActionPanel } from "@components/scene/actions";
import { ScriptActionPanel } from "@components/script/actions";
import { SwitchActionPanel } from "@components/switch/actions";
import { TimerActionPanel } from "@components/timer/actions";
import { UpdateActionPanel } from "@components/update/actions";
import { VacuumActionPanel } from "@components/vacuum/actions";
import { WeatherActionPanel } from "@components/weather/actions";
import { ZoneActionPanel } from "@components/zone/actions";
import { ha, shouldDisplayEntityID } from "@lib/common";
import { State } from "@lib/haapi";
import { getStateTooltip } from "@lib/utils";
import { ActionPanel, Color, Image, List, Toast, showToast } from "@raycast/api";
import React, { useState } from "react";
import { useStateSearch } from "./hooks";
import { getIcon, getStateValue } from "./utils";

export function StatesList(props: {
  domain: string;
  deviceClass?: string | undefined;
  entitiesState?: State[] | undefined;
}): React.ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(searchText, props.domain, props.deviceClass, props.entitiesState ?? allStates);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot search Home Assistant states.",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {states
        ?.sort((a, b) =>
          (a.attributes.friendly_name || a.entity_id).localeCompare(b.attributes.friendly_name || b.entity_id),
        )
        .map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
    </List>
  );
}

export function StateListItem(props: { state: State }): React.ReactElement {
  const state = props.state;

  let icon: Image.ImageLike | undefined;
  const subtitle = (state: State): string | undefined => {
    let extra: string | undefined;
    if (state.entity_id.startsWith("media_player")) {
      const parts = [];
      const song = getMediaPlayerTitleAndArtist(state);
      if (song) {
        parts.push(song);
      }
      const channel = state.attributes.media_channel;
      if (channel) {
        parts.push(channel);
      }
      extra = parts.join(" | ");

      const ep = state.attributes.entity_picture;
      if (ep) {
        icon = ha.urlJoin(ep);
      }
    }
    if (shouldDisplayEntityID()) {
      return extra;
    }
    if (extra) {
      return `${state.entity_id} | ${extra}`;
    }
    return state.entity_id;
  };

  const firstAccessoryTitle = (state: State): string => {
    try {
      const e = state.entity_id;
      if (e.startsWith("cover") && "current_position" in state.attributes) {
        const p = state.attributes.current_position;
        return `${p}%`;
      } else if (e.startsWith("climate") && "current_temperature" in state.attributes) {
        return `${state.attributes.current_temperature}°`;
      }
    } catch {
      // ignore
    }
    return "";
  };

  const firstAccessoryIcon = (state: State): Image.ImageLike | undefined => {
    try {
      const e = state.entity_id;
      if (e.startsWith("cover") && "current_position" in state.attributes) {
        return { source: "window-open.svg", tintColor: Color.SecondaryText };
      } else if (e.startsWith("climate") && "current_temperature" in state.attributes) {
        return { source: "thermometer.svg", tintColor: Color.SecondaryText };
      }
    } catch {
      // ignore
    }
  };

  const secondAccessoryIcon = (state: State): Image.ImageLike | undefined => {
    try {
      if (state.attributes.hvac_modes) {
        return { source: "cog.svg", tintColor: Color.SecondaryText };
      }
    } catch {
      // ignore
    }
  };

  return (
    <List.Item
      key={state.entity_id}
      title={state.attributes.friendly_name || state.entity_id}
      subtitle={subtitle(state)}
      actions={<StateActionPanel state={state} />}
      icon={icon || getIcon(state)}
      accessories={[
        {
          text: firstAccessoryTitle(state),
          icon: firstAccessoryIcon(state),
          tooltip: getStateTooltip(state),
        },
        {
          text: getStateValue(state),
          icon: secondAccessoryIcon(state),
          tooltip: getStateTooltip(state),
        },
      ]}
    />
  );
}

export function StateActionPanel(props: { state: State }): React.ReactElement {
  const state = props.state;
  const domain = props.state.entity_id.split(".")[0];

  switch (domain) {
    case "cover": {
      return <CoverActionPanel state={state} />;
    }
    case "fan": {
      return <FanActionPanel state={state} />;
    }
    case "light": {
      return <LightActionPanel state={state} />;
    }
    case "media_player": {
      return <MediaPlayerActionPanel state={state} />;
    }
    case "climate": {
      return <ClimateActionPanel state={state} />;
    }
    case "automation": {
      return <AutomationActionPanel state={state} />;
    }
    case "vacuum": {
      return <VacuumActionPanel state={state} />;
    }
    case "camera": {
      return <CameraActionPanel state={state} />;
    }
    case "script": {
      return <ScriptActionPanel state={state} />;
    }
    case "button": {
      return <ButtonActionPanel state={state} />;
    }
    case "scene": {
      return <SceneActionPanel state={state} />;
    }
    case "switch": {
      return <SwitchActionPanel state={state} />;
    }
    case "input_boolean": {
      return <InputBooleanActionPanel state={state} />;
    }
    case "input_number": {
      return <InputNumberActionPanel state={state} />;
    }
    case "timer": {
      return <TimerActionPanel state={state} />;
    }
    case "input_select": {
      return <InputSelectActionPanel state={state} />;
    }
    case "input_button": {
      return <InputButtonActionPanel state={state} />;
    }
    case "input_text": {
      return <InputTextActionPanel state={state} />;
    }
    case "input_datetime": {
      return <InputDateTimeActionPanel state={state} />;
    }
    case "update": {
      return <UpdateActionPanel state={state} />;
    }
    case "zone": {
      return <ZoneActionPanel state={state} />;
    }
    case "person": {
      return <PersonActionPanel state={state} />;
    }
    case "weather": {
      return <WeatherActionPanel state={state} />;
    }
    default: {
      return (
        <ActionPanel>
          <EntityStandardActionSections state={state} />
        </ActionPanel>
      );
    }
  }
}
