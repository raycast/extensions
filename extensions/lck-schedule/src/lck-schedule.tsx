import { Color, Image, List } from "@raycast/api";
import React from "react";

type Team = {
  teamId: string;
  name: string;
  nameAcronym: string;
  nameEng: string;
  nameEngAcronym: string;
  imageUrl: string;
  colorImageUrl: string;
  whiteImageUrl: string;
  blackImageUrl: string;
  dssWhiteImageUrl: string;
  dssBlackImageUrl: string;
  orderPoint: number;
};

type Match = {
  gameId: string;
  startDate: number;
  title: string;
  stadium: string;
  homeTeam: Team;
  awayTeam: Team;
  matchStatus: string;
  homeScore: number;
  awayScore: number;
  winner: "HOME" | "AWAY" | "NONE";
  maxMatchCount: number;
  currentMatchSet: number;
};

// API 응답 타입 정의
type ApiResponse = {
  code: number;
  content?: {
    matches: Match[];
  };
};

export default function Command() {
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchText, setSearchText] = React.useState("");

  React.useEffect(() => {
    // 현재 월과 다음 달 두 달치 데이터를 가져옴
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 다음 달 계산
    const nextMonthDate = new Date(now);
    nextMonthDate.setMonth(now.getMonth() + 1);
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;

    // 두 달치 데이터 모두 가져오기
    Promise.all([
      fetch(
        `https://esports-api.game.naver.com/service/v2/schedule/month?month=${currentMonth}&topLeagueId=lck&relay=false`,
      ).then((res) => res.json()) as Promise<ApiResponse>,
      fetch(
        `https://esports-api.game.naver.com/service/v2/schedule/month?month=${nextMonth}&topLeagueId=lck&relay=false`,
      ).then((res) => res.json()) as Promise<ApiResponse>,
    ])
      .then(([currentMonthData, nextMonthData]) => {
        const allMatches: Match[] = [];

        // 현재 월 데이터 추가
        if (currentMonthData.code === 200 && currentMonthData.content) {
          allMatches.push(...currentMonthData.content.matches);
        }

        // 다음 달 데이터 추가
        if (nextMonthData.code === 200 && nextMonthData.content) {
          allMatches.push(...nextMonthData.content.matches);
        }

        // TBD 경기 제외 - homeTeam 또는 awayTeam이 없거나 nameAcronym이 TBD인 경기 제외
        const filteredMatches = allMatches.filter(
          (match) =>
            match.homeTeam &&
            match.awayTeam &&
            match.homeTeam.teamId &&
            match.awayTeam.teamId &&
            match.homeTeam.nameAcronym !== "TBD" &&
            match.awayTeam.nameAcronym !== "TBD",
        );

        setMatches(filteredMatches);
      })
      .catch((err) => console.error("Error fetching LCK data:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const formatDate = (ms: number) => {
    const date = new Date(ms);
    // 2025년 5월 15일 (목) 형식으로 표시
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatTime = (ms: number) => {
    return new Date(ms).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScoreLabel = (match: Match) => {
    if (match.matchStatus !== "RESULT") return undefined;
    return {
      text: `${match.homeScore} : ${match.awayScore}`,
      color: Color.Green,
    };
  };

  const formatTeam = (match: Match, team: "homeTeam" | "awayTeam") => {
    if (match.matchStatus !== "RESULT") return match[team].nameEngAcronym;
    const winnerTeamId =
      match.winner === "HOME" ? match.homeTeam.teamId : match.winner === "AWAY" ? match.awayTeam.teamId : "";
    const teamId = match[team].teamId;
    const name = match[team].nameEngAcronym;
    return teamId === winnerTeamId ? `${name}` : name;
  };

  const getTeamIcon = (team: Team) => {
    return { source: team.colorImageUrl, mask: Image.Mask.RoundedRectangle };
  };

  const matchesByDate = matches.reduce<Record<string, Match[]>>((acc, match) => {
    if (match.matchStatus !== "BEFORE") return acc;
    const dateKey = formatDate(match.startDate);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(match);
    return acc;
  }, {});

  // 날짜별 정렬을 시간순으로 하기 위해 타임스탬프 사용
  const sortedDateKeys = Object.keys(matchesByDate).sort((a, b) => {
    const getTime = (key: string) => new Date(matchesByDate[key][0].startDate).getTime();
    return getTime(a) - getTime(b);
  });

  // 이전 경기 결과들을 날짜별로 그룹화
  const pastMatchesByDate = matches
    .filter((m) => m.matchStatus === "RESULT")
    .reduce<Record<string, Match[]>>((acc, match) => {
      const dateKey = formatDate(match.startDate);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(match);
      return acc;
    }, {});

  // 날짜별로 정렬 (최신 날짜가 먼저 오도록)
  const sortedPastDateKeys = Object.keys(pastMatchesByDate).sort((a, b) => {
    const getTime = (key: string) => new Date(pastMatchesByDate[key][0].startDate).getTime();
    return getTime(a) - getTime(b); // 내림차순 정렬
  });

  // 이전 경기는 최대 2개 날짜까지만 표시
  const limitedPastDateKeys = sortedPastDateKeys.slice(-2);

  // 가장 가까운 날짜의 경기들 찾기
  const upcomingMatches = matches.filter((m) => m.matchStatus === "BEFORE").sort((a, b) => a.startDate - b.startDate);

  // 다가오는 경기가 있다면 가장 빠른 경기 날짜를 구함
  const nextMatchDate = upcomingMatches.length > 0 ? formatDate(upcomingMatches[0].startDate) : null;

  // 검색 필터링 함수
  const filterMatch = (match: Match, searchText: string) => {
    if (!searchText) return true;
    const lowerSearchText = searchText.toLowerCase();
    return (
      // 홈팀 검색
      match.homeTeam.name.toLowerCase().includes(lowerSearchText) ||
      match.homeTeam.nameEng.toLowerCase().includes(lowerSearchText) ||
      match.homeTeam.nameEngAcronym.toLowerCase().includes(lowerSearchText) ||
      // 원정팀 검색
      match.awayTeam.name.toLowerCase().includes(lowerSearchText) ||
      match.awayTeam.nameEng.toLowerCase().includes(lowerSearchText) ||
      match.awayTeam.nameEngAcronym.toLowerCase().includes(lowerSearchText) ||
      // 날짜/시간 검색
      formatDate(match.startDate).toLowerCase().includes(lowerSearchText) ||
      formatTime(match.startDate).toLowerCase().includes(lowerSearchText)
    );
  };

  // 검색 필터링을 적용한 매치 가져오기
  const getFilteredPastMatches = (dateKey: string) => {
    return pastMatchesByDate[dateKey].filter((match) => filterMatch(match, searchText));
  };

  const getFilteredUpcomingMatches = (dateKey: string) => {
    return matchesByDate[dateKey].filter((match) => filterMatch(match, searchText));
  };

  // 검색 필터링 후 비어있지 않은 날짜만 표시
  const filteredPastDateKeys = limitedPastDateKeys.filter((dateKey) => getFilteredPastMatches(dateKey).length > 0);

  const filteredUpcomingDateKeys = sortedDateKeys.filter((dateKey) => getFilteredUpcomingMatches(dateKey).length > 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="팀명 또는 일정 검색" onSearchTextChange={setSearchText}>
      {/* 이전 경기 결과 (최대 2개 날짜만 표시) */}
      {filteredPastDateKeys.map((dateKey) => (
        <List.Section key={dateKey} title={dateKey}>
          {getFilteredPastMatches(dateKey).map((match) => {
            const scoreLabel = getScoreLabel(match);
            return (
              <List.Item
                key={match.gameId}
                title={`${formatTeam(match, "homeTeam")} vs ${formatTeam(match, "awayTeam")}`}
                subtitle={formatTime(match.startDate)}
                accessories={[
                  { icon: getTeamIcon(match.homeTeam) },
                  { text: "vs" },
                  { icon: getTeamIcon(match.awayTeam) },
                  ...(scoreLabel
                    ? [{ tag: { value: `${match.homeScore} : ${match.awayScore}`, color: Color.Green } }]
                    : []),
                ]}
              />
            );
          })}
        </List.Section>
      ))}

      {/* 예정된 경기 (날짜별로 표시) */}
      {filteredUpcomingDateKeys.map((dateKey) => (
        <List.Section key={dateKey} title={dateKey}>
          {getFilteredUpcomingMatches(dateKey).map((match) => {
            const isNextDay = dateKey === nextMatchDate;
            return (
              <List.Item
                key={match.gameId}
                title={`${formatTeam(match, "homeTeam")} vs ${formatTeam(match, "awayTeam")}`}
                subtitle={formatTime(match.startDate)}
                accessories={[
                  { icon: getTeamIcon(match.homeTeam) },
                  { text: "vs" },
                  { icon: getTeamIcon(match.awayTeam) },
                  ...(isNextDay ? [{ tag: { value: "예정됨", color: Color.Blue } }] : []),
                ]}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
