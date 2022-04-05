import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSquad } from "../api";
import { Squad, Team } from "../types";
import Player from "./player";

const getFlagEmoji = (isoCode?: string) => {
  if (!isoCode) return "🏴";

  if (isoCode === "GB-ENG") {
    return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  }
  if (isoCode === "GB-WLS") {
    return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
  }
  if (isoCode === "GB-SCT") {
    return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  }
  if (isoCode === "GB-NIR") {
    // The only official flag in Northern Ireland is the Union Flag of the United Kingdom.
    return "🇬🇧";
  }

  return isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};

export default function ClubSquad(props: Team) {
  const [members, setMembers] = useState<Squad[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    setLoading(true);
    setMembers([]);

    getSquad(props.slug).then((data) => {
      setMembers(data);
      setLoading(false);
    });
  }, [props.slug]);

  return (
    <List
      throttle
      navigationTitle={`Squad | ${props.nickname} | Club`}
      isLoading={loading}
    >
      {members.map((member) => {
        return (
          <List.Item
            key={member.id}
            title={member.person.name}
            subtitle={member.position.name}
            icon={member.photos["001"]["64x70"]}
            accessories={
              member.person.country
                ? [
                    { text: member.person.country.id },
                    { icon: getFlagEmoji(member.person.country.id) },
                  ]
                : undefined
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Player Profile"
                  icon={Icon.Sidebar}
                  target={<Player {...member} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
