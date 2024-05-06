import {
  Color,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openCommandPreferences,
} from "@raycast/api";
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
  const recentRunTotal = getAllDistance(data, "Run", 28);
  const recentRideTotal = getAllDistance(data, "Ride", 28);
  const recentSwimTotal = getAllDistance(data, "Swim", 28);

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

  const toIndex = async (days: string, type: string) => {
    await launchCommand({
      name: "index",
      type: LaunchType.UserInitiated,
      context: {
        days,
        type,
      },
    });
  };

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
          onAction={() => toIndex("recent", "Run")}
        />
        <MenuBarExtra.Item
          title={`${recentRideTotal}`}
          icon={{ source: sportsIcons.Ride, tintColor: Color.PrimaryText }}
          onAction={() => toIndex("recent", "Ride")}
        />
        <MenuBarExtra.Item
          title={`${recentSwimTotal}`}
          icon={{ source: sportsIcons.Swim, tintColor: Color.PrimaryText }}
          onAction={() => toIndex("recent", "Swim")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="This Year">
        <MenuBarExtra.Item
          title={`${ytdRunTotal}`}
          tooltip={"Year Run"}
          icon={{ source: sportsIcons.Run, tintColor: Color.PrimaryText }}
          onAction={() => toIndex("year", "Run")}
        />
        <MenuBarExtra.Item
          title={`${ytdRideTotal}`}
          tooltip={"Year Ride"}
          icon={{ source: sportsIcons.Ride, tintColor: Color.PrimaryText }}
          onAction={() => toIndex("year", "Ride")}
        />
        <MenuBarExtra.Item
          title={`${ytdSwimTotal}`}
          tooltip={"Year Swim"}
          icon={{ source: sportsIcons.Swim, tintColor: Color.PrimaryText }}
          onAction={() => toIndex("year", "Swim")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="All Time">
        <MenuBarExtra.Item
          title={`${allRunTotal}`}
          tooltip={"Run"}
          icon={{ source: sportsIcons.Run, tintColor: Color.PrimaryText }}
          onAction={() => toIndex("all", "Run")}
        />
        <MenuBarExtra.Item
          title={`${allRideTotal}`}
          tooltip={"All Ride"}
          icon={{ source: sportsIcons.Ride, tintColor: Color.PrimaryText }}
          onAction={() => toIndex("all", "Ride")}
        />
        <MenuBarExtra.Item
          title={`${allSwimTotal}`}
          tooltip={"All Swim"}
          icon={{ source: sportsIcons.Swim, tintColor: Color.PrimaryText }}
          onAction={() => toIndex("all", "Swim")}
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
