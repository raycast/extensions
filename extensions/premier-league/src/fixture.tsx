import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import groupBy from "lodash.groupby";
import { seasons } from "./components/season_dropdown";
import { getFixtures } from "./api";
import { Content } from "./types/fixture";

export default function Fixture() {
  const [fixtures, setFixtures] = useState<Content[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);

    getFixtures(seasons[0].value).then((data) => {
      setFixtures(data);
      setLoading(false);
    });
  }, []);

  const categories = groupBy(fixtures, (f) => f.kickoff.label?.split(",")[0]);

  return (
    <List throttle isLoading={loading}>
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
                  subtitle={`${match.ground.name}, ${match.ground.city}`}
                  accessoryTitle={match.kickoff.label}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
