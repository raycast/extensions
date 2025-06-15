import { launchWeatherCommand } from "@components/weather/menu";
import { State } from "@lib/haapi";
import { formatToHumanDateTime, stringToDate } from "@lib/utils";
import { MenuBarExtra } from "@raycast-community/ui";
import { Icon } from "@raycast/api";

interface SunDateTimeEventMenuBarItemProps extends MenuBarExtra.Item.Props {
  datetime: string | undefined;
}

function SunDateTimeEventMenuBarItem({ datetime, ...restProps }: SunDateTimeEventMenuBarItemProps) {
  const dt = stringToDate(datetime);
  if (dt === undefined || dt === null) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      subtitle={formatToHumanDateTime(dt)}
      onAction={() => {}}
      tooltip={dt.toLocaleString()}
      {...restProps}
    />
  );
}

interface SunNumericMenuBarItemProps extends MenuBarExtra.Item.Props {
  value: number | undefined;
}

function SunNumericMenuBarItem({ value, ...restProps }: SunNumericMenuBarItemProps) {
  if (value === undefined || value === null) {
    return null;
  }
  return (
    <MenuBarExtra.Item subtitle={`${value}`} onAction={launchWeatherCommand} tooltip={`${value}`} {...restProps} />
  );
}

function SunStateMenuBarItem({ sun, ...restProps }: { sun: State | undefined }) {
  if (!sun) {
    return null;
  }
  const humanStates: Record<string, string> = {
    above_horizon: "Above Horizon",
    below_horizon: "Below Horizon",
  };
  const stateIcons: Record<string, string> = {
    above_horizon: Icon.Sun,
    below_horizon: Icon.Moon,
  };
  const humanState = humanStates[sun.state] ?? "?";
  const icon = stateIcons[sun.state];
  return (
    <MenuBarExtra.Item
      title={humanState}
      icon={icon}
      tooltip={humanState}
      onAction={launchWeatherCommand}
      {...restProps}
    />
  );
}

export function SunMenubarSection({ sun }: { sun: State | undefined }) {
  if (!sun) {
    return null;
  }
  const attr = sun.attributes;
  return (
    <MenuBarExtra.Section title="Sun">
      <SunStateMenuBarItem sun={sun} />
      <SunNumericMenuBarItem title="Elevation" value={attr.elevation} icon={Icon.ArrowCounterClockwise} />
      <SunNumericMenuBarItem title="Azimuth" value={attr.azimuth} icon={Icon.ArrowClockwise} />
      <SunDateTimeEventMenuBarItem title="Next Sunrise" datetime={attr.next_rising} icon={Icon.Sun} />
      <SunDateTimeEventMenuBarItem title="Next Sunset" datetime={attr.next_setting} icon={Icon.Sunrise} />
    </MenuBarExtra.Section>
  );
}
