import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import groupBy from "lodash.groupby";
import { getFixtures } from "./api";
import { Content } from "./types/fixture";
import ClubDropdown from "./components/club_dropdown";

export default function Fixture() {
  const [fixtures, setFixtures] = useState<Content[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [club, setClub] = useState<string>("-1");

  useEffect(() => {
    setFixtures([]);
    setLoading(true);

    getFixtures(club).then((data) => {
      setFixtures(data);
      setLoading(false);
    });
  }, [club]);

  const categories = groupBy(fixtures, (f) => f.kickoff.label?.split(",")[0]);

  return (
    <List
      throttle
      isLoading={loading}
      searchBarAccessory={<ClubDropdown onSelect={setClub} />}
    >
      {Object.entries(categories).map(([label, matches]) => {
        return (
          <List.Section
            key={label}
            title={label === "undefined" ? "Date To Be Confirmed" : label}
          >
            {matches.map((match) => {
              return (
                <List.Item
                  key={match.id}
                  title={`${match.teams[0].team.name} - ${match.teams[1].team.name}`}
                  subtitle={`🏟️ ${match.ground.name}, ${match.ground.city}`}
                  accessories={[{ text: match.kickoff.label || "TBC" }]}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
