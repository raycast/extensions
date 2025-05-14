import { Color, Image, List } from "@raycast/api";
import React from "react";

type Team = {
  teamId: string;
  rank: number;
  wins: number;
  loses: number;
  score: number;
  winRate: number;
  team: {
    name: string;
    nameEng: string;
    nameEngAcronym: string;
    imageUrl: string;
    colorImageUrl: string;
  };
};

export default function Command() {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchText, setSearchText] = React.useState("");

  React.useEffect(() => {
    fetch("https://esports-api.game.naver.com/service/v1/ranking/lck_2025/team")
      .then((res) => res.json())
      .then((data) => {
        const content = (data as { content: Team[] }).content;
        setTeams(content);
      })
      .catch((err) => console.error("Error fetching LCK team rankings:", err))
      .finally(() => setIsLoading(false));
  }, []);

  // 승률을 백분율로 표시하는 함수
  const formatWinRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  // 승-패 기록 표시
  const formatRecord = (wins: number, loses: number) => {
    return `${wins}승 ${loses}패`;
  };

  // 검색 필터링 함수
  const filterTeam = (team: Team, searchText: string) => {
    if (!searchText) return true;
    const lowerSearchText = searchText.toLowerCase();
    return (
      team.team.name.toLowerCase().includes(lowerSearchText) ||
      team.team.nameEng.toLowerCase().includes(lowerSearchText) ||
      team.team.nameEngAcronym.toLowerCase().includes(lowerSearchText)
    );
  };

  // 검색어에 따라 필터링된 팀 목록 (순위 유지)
  const filteredTeams = teams.filter((team) => filterTeam(team, searchText));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="팀명 검색" onSearchTextChange={setSearchText}>
      {filteredTeams.map((team) => {
        return (
          <List.Item
            key={team.teamId}
            title={`${team.rank}  -  ${team.team.name}`}
            subtitle={team.team.nameEng}
            icon={{ source: team.team.colorImageUrl, mask: Image.Mask.RoundedRectangle }}
            accessories={[
              { text: formatRecord(team.wins, team.loses), tooltip: "승-패" },
              { text: formatWinRate(team.winRate), tooltip: "승률" },
              {
                tag: {
                  value: `${team.score > 0 ? "+" : ""}${team.score}`,
                  color: team.score > 0 ? Color.Green : team.score < 0 ? Color.Red : Color.PrimaryText,
                },
              },
            ]}
          />
        );
      })}
    </List>
  );
}
