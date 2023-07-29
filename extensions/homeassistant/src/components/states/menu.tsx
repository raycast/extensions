import { State } from "../../haapi";
import { getIcon, getStateValue } from "../states";
import { getFriendlyName } from "../../utils";
import { MediaPlayerMenubarItem } from "../mediaplayer/menu";
import { CoverMenubarItem } from "../cover/menu";
import { PersonMenubarItem } from "../persons/menu";
import { SwitchMenubarItem } from "../switches/menu";
import { CopyToClipboardMenubarItem, MenuBarSubmenu } from "../menu";
import { LightMenubarItem } from "../lights/menu";
import { WeatherMenubarItem } from "../weather/menu";
import { CameraMenubarItem } from "../camera/menu";
import { ButtonMenubarItem } from "../button/menu";

export function CopyEntityIDToClipboard(props: { state: State }) {
  const s = props.state;
  return <CopyToClipboardMenubarItem title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />;
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
  }
  return (
    <MenuBarSubmenu key={s.entity_id} title={getFriendlyName(s)} subtitle={getStateValue(s)} icon={getIcon(s)}>
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
