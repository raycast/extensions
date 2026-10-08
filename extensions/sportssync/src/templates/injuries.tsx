import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import getInjuries from "../utils/getInjuries";
import sportInfo from "../utils/getSportInfo";
import TeamDetail from "../views/teamDetail";

export default function DisplayInjuries() {
  const { injuryData, injuryLoading, injuryRevalidate } = getInjuries();
  const currentLeague = sportInfo?.getLeague();

  const injuryItems = injuryData?.injuries.flatMap((injuryItem) => injuryItem?.injuries) || [];
  const playerInjuryItems = injuryItems?.map((injury, index) => {
    const injuryDate = injury?.details?.returnDate ?? "Unknown";

    if (!injuryDate) {
      return null;
    }

    let tagColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.MedicalSupport, tintColor: Color.SecondaryText };

    if (injury.status === "Day-To-Day") {
      tagColor = Color.Yellow;
      accessoryIcon = { source: Icon.MedicalSupport, tintColor: Color.Yellow };
    }

    if (injury.status === "Out") {
      tagColor = Color.Orange;
      accessoryIcon = { source: Icon.MedicalSupport, tintColor: Color.Orange };
    }

    if (injury.status === "Injured Reserve" || injury.status === "Questionable" || injury.status.includes("Day-IL")) {
      tagColor = Color.Red;
      accessoryIcon = { source: Icon.MedicalSupport, tintColor: Color.Red };
    }

    if (injury.status === "Suspension") {
      tagColor = Color.Orange;
      accessoryIcon = { source: Icon.Warning, tintColor: Color.Orange };
    }

    return (
      <List.Item
        key={index}
        title={`${injury?.athlete?.displayName ?? "Unknown"}`}
        subtitle={`${injury?.athlete?.position?.displayName ?? "Unknown"}`}
        icon={{
          source:
            injury?.athlete?.team?.logos?.[0]?.href ??
            `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png&w=100&h=100&transparent=true`,
        }}
        accessories={[
          {
            tag: { value: injury?.status?.replace(/-/g, " "), color: tagColor },
            tooltip: "Status",
          },
          { text: injuryDate, tooltip: "Est. Return Date" },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title={`View ${injury?.athlete?.displayName ?? "Unknown"} Profile on ESPN`}
              url={`${injury?.athlete?.links?.[0]?.href ?? `https://www.espn.com/${currentLeague}`}`}
            />
            <Action.Push
              title={`View ${injury?.athlete?.team?.displayName ?? "Team"} Details`}
              icon={Icon.List}
              target={<TeamDetail teamId={injury?.athlete?.team?.id ?? ""} />}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={injuryRevalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            ></Action>
          </ActionPanel>
        }
      />
    );
  });

  if (injuryLoading) {
    return <Detail isLoading={true} />;
  }

  if (!injuryData || playerInjuryItems.length === 0) {
    return <List.EmptyView icon="Empty.png" title="No Results Found" />;
  }

  return (
    <>
      <List.Section title="Injury Status">{playerInjuryItems}</List.Section>
    </>
  );
}
