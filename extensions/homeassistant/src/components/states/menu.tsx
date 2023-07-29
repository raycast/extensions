import { State } from "../../haapi";
import { getIcon, getStateValue } from "../states";
import { ensureShort, getFriendlyName } from "../../utils";
import { MediaPlayerMenubarItem } from "../mediaplayer/menu";
import { CoverMenubarItem } from "../cover/menu";
import { PersonMenubarItem } from "../persons/menu";
import { SwitchMenubarItem } from "../switches/menu";
import { CopyToClipboardMenubarItem, MenuBarSubmenu } from "../menu";
import { LightMenubarItem } from "../lights/menu";
import { WeatherMenubarItem } from "../weather/menu";
import { CameraMenubarItem } from "../camera/menu";
import { ButtonMenubarItem } from "../button/menu";
import { InputBooleanMenubarItem } from "../input_boolean/menu";
import { InputSelectMenubarItem } from "../input_select/menu";

export function CopyEntityIDToClipboard(props: { state: State }) {
  const s = props.state;
  return <CopyToClipboardMenubarItem title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />;
}

export function CopyEntityStateToClipboardMenubarItem(props: { state: State }) {
  const s = props.state;
  return <CopyToClipboardMenubarItem title="Copy Entity State" content={s.state} tooltip={s.state} />;
}

export function StateMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const e = s.entity_id;
  const domain = e.split(".")[0];
  switch (domain) {
    case "media_player": {
      return <MediaPlayerMenubarItem state={s} />;
    }
    case "cover": {
      return <CoverMenubarItem state={s} />;
    }
    case "person": {
      return <PersonMenubarItem state={s} />;
    }
    case "switch": {
      return <SwitchMenubarItem state={s} />;
    }
    case "light": {
      return <LightMenubarItem state={s} />;
    }
    case "weather": {
      return <WeatherMenubarItem state={s} />;
    }
    case "camera": {
      return <CameraMenubarItem state={s} />;
    }
    case "button": {
      return <ButtonMenubarItem state={s} />;
    }
    case "input_boolean": {
      return <InputBooleanMenubarItem state={s} />;
    }
    case "input_select": {
      return <InputSelectMenubarItem state={s} />;
    }
  }
  return (
    <MenuBarSubmenu
      key={s.entity_id}
      title={getFriendlyName(s)}
      subtitle={ensureShort(getStateValue(s))}
      icon={getIcon(s)}
    >
      <CopyEntityIDToClipboard state={s} />
      <CopyEntityStateToClipboardMenubarItem state={s} />
    </MenuBarSubmenu>
  );
}
