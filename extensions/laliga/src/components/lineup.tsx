import { List } from "@raycast/api";
import { getAvatarIcon, usePromise } from "@raycast/utils";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import { useState } from "react";
import { getMatchLineups } from "../api";

const posMap: Record<string, string> = {
  undefined: "Trainers",
  start: "Starters",
  sub: "Substitutes",
};

export default function MatchLineups(props: { slug: string; name: string }) {
  const { data, isLoading } = usePromise(getMatchLineups, [props.slug]);

  const [team, setTeam] = useState<string>("");
  const teamMap = groupBy(data, (d) => d.team.nickname);

  return (
    <List
      navigationTitle={`${props.name} | Lineups`}
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Change Team" onChange={setTeam}>
          {Object.values(teamMap).map(([team]) => {
            return (
              <List.Dropdown.Item
                key={team.team.id}
                value={team.team.nickname}
                title={team.team.nickname}
                icon={team.team.shield.url}
              />
            );
          })}
        </List.Dropdown>
      }
    >
      {Object.entries(groupBy(teamMap[team], "status")).map(([status, persons]) => {
        return (
          <List.Section key={status} title={posMap[status]}>
            {persons.map((person) => {
              const accessories: List.Item.Accessory[] = [];

              if (person.captain) {
                accessories.push({ icon: getAvatarIcon("C") });
              }

              return (
                <List.Item
                  key={person.id}
                  title={person?.shirt_number?.toString() ?? "Coach"}
                  subtitle={person.person.nickname}
                  keywords={[person.person.nickname, person.person.name]}
                  accessories={accessories}
                  detail={
                    <List.Item.Detail
                      markdown={json2md([
                        {
                          img: {
                            source: person.photos["001"]["512x556"],
                          },
                        },
                      ])}
                    />
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
