import { Color, getPreferenceValues, Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useRunningPage } from "./hook/useRunningPage";
import { github } from "./util/auth";
import { getAllDistance, getOwnerAndRepository } from "./util/utils";
import { sportsIcons } from "./util/const";

function MenuBarTotals() {
  const preferences = getPreferenceValues<Preferences.MenubarTotals>();
  const ownerAndRepository = getOwnerAndRepository(preferences.repository);
  const { isLoading, data } = useRunningPage({ ...ownerAndRepository, path: preferences.path });

  if (!data) {
    return <MenuBarExtra isLoading={isLoading} />;
  }
  const recentRunTotal = getAllDistance(data, "Run", 14);
  const recentRideTotal = getAllDistance(data, "Ride", 14);
  const recentSwimTotal = getAllDistance(data, "Swim", 14);

  const ytdRunTotal = getAllDistance(data, "Run", 365);
  const ytdRideTotal = getAllDistance(data, "Ride", 365);
  const ytdSwimTotal = getAllDistance(data, "Swim", 365);

  const allRunTotal = getAllDistance(data, "Run", -1);
  const allRideTotal = getAllDistance(data, "Ride", -1);
  const allSwimTotal = getAllDistance(data, "Swim", -1);

  const primarySport = preferences.primary_sport;
  const primaryStat = preferences.primary_stat;
  const iconSrc = sportsIcons[primarySport];

  let primarySportTotal = primaryStat === "year" ? ytdRunTotal : primaryStat === "all" ? allRunTotal : recentRunTotal;
  if (primarySport === "Ride") {
    primarySportTotal = primaryStat === "year" ? ytdRideTotal : primaryStat === "all" ? allRideTotal : recentRideTotal;
  } else if (primarySport === "Swim") {
    primarySportTotal = primaryStat === "year" ? ytdSwimTotal : primaryStat === "all" ? allSwimTotal : recentSwimTotal;
  }

  return (
    <MenuBarExtra
      icon={{
        source: iconSrc,
        tintColor: Color.PrimaryText,
      }}
      title={`${primarySportTotal}`}
      tooltip={`${primarySport} ${primaryStat}`}
    >
      <MenuBarExtra.Section title="Last 4 weeks">
        <MenuBarExtra.Item
          title={`${recentRunTotal}`}
          icon={{ source: sportsIcons.Run, tintColor: Color.PrimaryText }}
        />
        <MenuBarExtra.Item
          title={`${recentRideTotal}`}
          icon={{ source: sportsIcons.Ride, tintColor: Color.PrimaryText }}
        />
        <MenuBarExtra.Item
          title={`${recentSwimTotal}`}
          icon={{ source: sportsIcons.Swim, tintColor: Color.PrimaryText }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="This Year">
        <MenuBarExtra.Item title={`${ytdRunTotal}`} icon={{ source: sportsIcons.Run, tintColor: Color.PrimaryText }} />
        <MenuBarExtra.Item
          title={`${ytdRideTotal}`}
          icon={{ source: sportsIcons.Ride, tintColor: Color.PrimaryText }}
        />
        <MenuBarExtra.Item
          title={`${ytdSwimTotal}`}
          icon={{ source: sportsIcons.Swim, tintColor: Color.PrimaryText }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="All Time">
        <MenuBarExtra.Item title={`${allRunTotal}`} icon={{ source: sportsIcons.Run, tintColor: Color.PrimaryText }} />
        <MenuBarExtra.Item
          title={`${allRideTotal}`}
          icon={{ source: sportsIcons.Ride, tintColor: Color.PrimaryText }}
        />
        <MenuBarExtra.Item
          title={`${allSwimTotal}`}
          icon={{ source: sportsIcons.Swim, tintColor: Color.PrimaryText }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default withAccessToken(github)(MenuBarTotals);
