import { ActionPanel, List, showToast, Image, Toast } from "@raycast/api";
import { State } from "../../haapi";
import { useState } from "react";
import { ha, shouldDisplayEntityID } from "../../common";
import { useHAStates } from "../../hooks";
import { EntityStandardActionSections } from "../entity";
import { MediaPlayerActionPanel } from "../mediaplayer/actions";
import { FanActionPanel } from "../fan/actions";
import { LightActionPanel } from "../light/actions";
import { AutomationActionPanel } from "../automation/actions";
import { VacuumActionPanel } from "../vacuum/actions";
import { ScriptActionPanel } from "../script/actions";
import { ButtonActionPanel } from "../button/actions";
import { SceneActionPanel } from "../scene/actions";
import { InputBooleanActionPanel } from "../input_boolean/actions";
import { InputNumberActionPanel } from "../input_number/actions";
import { TimerActionPanel } from "../timer/actions";
import { InputSelectActionPanel } from "../input_select/actions";
import { InputButtonActionPanel } from "../input_button/actions";
import { InputTextActionPanel } from "../input_text/actions";
import { InputDateTimeActionPanel } from "../input_datetime/actions";
import { PersonActionPanel } from "../persons/actions";
import { getStateTooltip } from "../../utils";
import { getMediaPlayerTitleAndArtist } from "../mediaplayer/utils";
import { CameraActionPanel } from "../camera/actions";
import { UpdateActionPanel } from "../update/actions";
import { ZoneActionPanel } from "../zone/actions";
import { SwitchActionPanel } from "../switches/actions";
import { WeatherActionPanel } from "../weather/actions";
import { ClimateActionPanel } from "../climate/actions";
import { CoverActionPanel } from "../cover/actions";
import { useStateSearch } from "./hooks";
import { getIcon, getStateValue } from "./utils";

export function StatesList(props: { domain: string; deviceClass?: string | undefined }): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(searchText, props.domain, props.deviceClass, allStates);

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
      {states?.map((state) => <StateListItem key={state.entity_id} state={state} />)}
    </List>
  );
}

export function StateListItem(props: { state: State }): JSX.Element {
  const state = props.state;
  const extraTitle = (state: State): string => {
    try {
      const e = state.entity_id;
      if (e.startsWith("cover") && "current_position" in state.attributes) {
        const p = state.attributes.current_position;
        if (p > 0 && p < 100) {
          return `${p}% | `;
        }
      } else if (e.startsWith("climate") && "current_temperature" in state.attributes) {
        return `${state.attributes.current_temperature} | `;
      }
    } catch (e) {
      // ignore
    }
    return "";
  };

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

  return (
    <List.Item
      key={state.entity_id}
      title={state.attributes.friendly_name || state.entity_id}
      subtitle={subtitle(state)}
      actions={<StateActionPanel state={state} />}
      icon={icon || getIcon(state)}
      accessories={[
        {
          text: extraTitle(state) + getStateValue(state),
          tooltip: getStateTooltip(state),
        },
      ]}
    />
  );
}

export function StateActionPanel(props: { state: State }): JSX.Element {
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
