import { Icon, MenuBarExtra } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  // Fetch NHL Games

  const { data: nhlScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
  );

  const nhlGames = nhlScoresAndSchedule?.events || [];
  const nhlItems = nhlGames.map((nhlGame, index) => {
    const gameTime = new Date(nhlGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let title = `${nhlGame.shortName} - ${gameTime}`;

    if (nhlGame.status.type.state === "in") {
      title = `${nhlGame.competitions[0].competitors[1].team.abbreviation} ${nhlGame.competitions[0].competitors[1].score} - ${nhlGame.competitions[0].competitors[0].team.abbreviation} ${nhlGame.competitions[0].competitors[0].score}     P${nhlGame.status.period} ${nhlGame.status.displayClock}`;
    }

    if (nhlGame.status.type.state === "post") {
      title = `${nhlGame.competitions[0].competitors[1].team.abbreviation} ${nhlGame.competitions[0].competitors[1].score} - ${nhlGame.competitions[0].competitors[0].team.abbreviation} ${nhlGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (nhlGame.status.type.state === "post" && nhlGame.status.type.completed === false) {
      title = `${nhlGame.competitions[0].competitors[1].team.abbreviation} - ${nhlGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} onAction={() => open("")} />;
  });

  const nhlGamesDate = nhlScoresAndSchedule.day.date;

  console.log(nhlGamesDate);

  // Fetch NBA Games

  const { data: nbaScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  );

  const nbaGames = nbaScoresAndSchedule?.events || [];
  const nbaItems = nbaGames.map((nbaGame, index) => {
    const gameTime = new Date(nbaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let title = `${nbaGame.shortName} - ${gameTime}`;

    if (nbaGame.status.type.state === "in") {
      title = `${nbaGame.competitions[0].competitors[1].team.abbreviation} ${nbaGame.competitions[0].competitors[1].score} - ${nbaGame.competitions[0].competitors[0].team.abbreviation} ${nbaGame.competitions[0].competitors[0].score}     Q${nbaGame.status.period} ${nbaGame.status.displayClock}`;
    }

    if (nbaGame.status.type.state === "post") {
      title = `${nbaGame.competitions[0].competitors[1].team.abbreviation} ${nbaGame.competitions[0].competitors[1].score} - ${nbaGame.competitions[0].competitors[0].team.abbreviation} ${nbaGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (nbaGame.status.type.state === "post" && nbaGame.status.type.completed === false) {
      title = `${nbaGame.competitions[0].competitors[1].team.abbreviation} - ${nbaGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} onAction={() => open("")} />;
  });

  const nbaGamesDate = nbaScoresAndSchedule.day.date;

  // Fetch WNBA Games

  const { data: wnbaScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard",
  );

  const wnbaGames = wnbaScoresAndSchedule?.events || [];
  const wnbaItems = wnbaGames.map((wnbaGame, index) => {
    const gameTime = new Date(wnbaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let title = `${wnbaGame.shortName} - ${gameTime}`;

    if (wnbaGame.status.type.state === "in") {
      title = `${wnbaGame.competitions[0].competitors[1].team.abbreviation} ${wnbaGame.competitions[0].competitors[1].score} - ${wnbaGame.competitions[0].competitors[0].team.abbreviation} ${wnbaGame.competitions[0].competitors[0].score}     Q${wnbaGame.status.period} ${wnbaGame.status.displayClock}`;
    }

    if (wnbaGame.status.type.state === "post") {
      title = `${wnbaGame.competitions[0].competitors[1].team.abbreviation} ${wnbaGame.competitions[0].competitors[1].score} - ${wnbaGame.competitions[0].competitors[0].team.abbreviation} ${wnbaGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (wnbaGame.status.type.state === "post" && wnbaGame.status.type.completed === false) {
      title = `${wnbaGame.competitions[0].competitors[1].team.abbreviation} - ${wnbaGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} onAction={() => open("")} />;
  });

  const wnbaGamesDate = wnbaScoresAndSchedule.day.date;

  // Fetch NCAA Men's Games

  const { data: mncaaScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard",
  );

  const mncaaGames = mncaaScoresAndSchedule?.events || [];
  const mncaaItems = mncaaGames.map((mncaaGame, index) => {
    const gameTime = new Date(mncaaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let title = `${mncaaGame.shortName} - ${gameTime}`;

    if (mncaaGame.status.type.state === "in") {
      title = `${mncaaGame.competitions[0].competitors[1].team.abbreviation} ${mncaaGame.competitions[0].competitors[1].score} - ${mncaaGame.competitions[0].competitors[0].team.abbreviation} ${mncaaGame.competitions[0].competitors[0].score}     Q${mncaaGame.status.period} ${mncaaGame.status.displayClock}`;
    }

    if (mncaaGame.status.type.state === "post") {
      title = `${mncaaGame.competitions[0].competitors[1].team.abbreviation} ${mncaaGame.competitions[0].competitors[1].score} - ${mncaaGame.competitions[0].competitors[0].team.abbreviation} ${mncaaGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (mncaaGame.status.type.state === "post" && mncaaGame.status.type.completed === false) {
      title = `${mncaaGame.competitions[0].competitors[1].team.abbreviation} - ${mncaaGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} onAction={() => open("")} />;
  });

  const mncaaGamesDate = mncaaScoresAndSchedule.day.date;

  // Fetch NCAA Women's Games

  const { data: wncaaScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard",
  );

  const wncaaGames = wncaaScoresAndSchedule?.events || [];
  const wncaaItems = wncaaGames.map((wncaaGame, index) => {
    const gameTime = new Date(wncaaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let title = `${wncaaGame.shortName} - ${gameTime}`;

    if (wncaaGame.status.type.state === "in") {
      title = `${wncaaGame.competitions[0].competitors[1].team.abbreviation} ${wncaaGame.competitions[0].competitors[1].score} - ${wncaaGame.competitions[0].competitors[0].team.abbreviation} ${wncaaGame.competitions[0].competitors[0].score}     Q${wncaaGame.status.period} ${wncaaGame.status.displayClock}`;
    }

    if (wncaaGame.status.type.state === "post") {
      title = `${wncaaGame.competitions[0].competitors[1].team.abbreviation} ${wncaaGame.competitions[0].competitors[1].score} - ${wncaaGame.competitions[0].competitors[0].team.abbreviation} ${wncaaGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (wncaaGame.status.type.state === "post" && wncaaGame.status.type.completed === false) {
      title = `${wncaaGame.competitions[0].competitors[1].team.abbreviation} - ${wncaaGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} subtitle={``} onAction={() => open("")} />;
  });

  const wncaaGamesDate = wncaaScoresAndSchedule.day.date;

  // Fetch NFL Games

  const { data: nflScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  );

  const nflDayItems = [];
  const nflGames = nflScoresAndSchedule?.events || [];

  nflGames.forEach((nflGame) => {
    const gameDate = new Date(nflGame.date);
    const nflGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    let nflDay = nflDayItems.find((day) => day.title === nflGameDay);

    if (!nflDay) {
      nflDay = { title: nflGameDay, games: [] };
      nflDayItems.push(nflDay);
    }

    const nflGameTime = gameDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let title = `${nflGame.shortName} - ${nflGameTime}`;

    if (nflGame.status.type.state === "in") {
      title = `${nflGame.competitions[0].competitors[1].team.abbreviation} ${nflGame.competitions[0].competitors[1].score} - ${nflGame.competitions[0].competitors[0].team.abbreviation} ${nflGame.competitions[0].competitors[0].score}     Q${nflGame.status.period} ${nflGame.status.displayClock}`;
    }

    if (nflGame.status.type.state === "post") {
      title = `${nflGame.competitions[0].competitors[1].team.abbreviation} ${nflGame.competitions[0].competitors[1].score} - ${nflGame.competitions[0].competitors[0].team.abbreviation} ${nflGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (nflGame.status.type.state === "post" && nflGame.status.type.completed === false) {
      title = `${nflGame.competitions[0].competitors[1].team.abbreviation} - ${nflGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    nflDay.games.push({
      title: `${title}`,
      onAction: () => open(""),
    });
  });

  nflDayItems.sort((a, b) => new Date(a.title) - new Date(b.title));

  const nflItems = nflDayItems.map((nflDay, index) => (
    <MenuBarExtra.Submenu key={index} title={nflDay.title}>
      {nflDay.games.map((game, gameIndex) => (
        <MenuBarExtra.Item key={gameIndex} title={game.title} onAction={game.onAction} />
      ))}
    </MenuBarExtra.Submenu>
  ));

  // Fetch NCAA Football Games

  const { data: ncaaScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
  );

  const ncaaDayItems = [];
  const ncaaGames = ncaaScoresAndSchedule?.events || [];

  ncaaGames.forEach((ncaaGame) => {
    const gameDate = new Date(ncaaGame.date);
    const ncaaGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    let ncaaDay = ncaaDayItems.find((day) => day.title === ncaaGameDay);

    if (!ncaaDay) {
      ncaaDay = { title: ncaaGameDay, games: [] };
      ncaaDayItems.push(ncaaDay);
    }

    const ncaaGameTime = gameDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let title = `${ncaaGame.shortName} - ${ncaaGameTime}`;

    if (ncaaGame.status.type.state === "in") {
      title = `${ncaaGame.competitions[0].competitors[1].team.abbreviation} ${ncaaGame.competitions[0].competitors[1].score} - ${ncaaGame.competitions[0].competitors[0].team.abbreviation} ${ncaaGame.competitions[0].competitors[0].score}     Q${ncaaGame.status.period} ${ncaaGame.status.displayClock}`;
    }

    if (ncaaGame.status.type.state === "post") {
      title = `${ncaaGame.competitions[0].competitors[1].team.abbreviation} ${ncaaGame.competitions[0].competitors[1].score} - ${ncaaGame.competitions[0].competitors[0].team.abbreviation} ${ncaaGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (ncaaGame.status.type.state === "post" && ncaaGame.status.type.completed === false) {
      title = `${ncaaGame.competitions[0].competitors[1].team.abbreviation} - ${ncaaGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    ncaaDay.games.push({
      title: `${title}`,
      onAction: () => open(""),
    });
  });

  ncaaDayItems.sort((a, b) => new Date(a.title) - new Date(b.title));

  const ncaaItems = ncaaDayItems.map((ncaaDay, index) => (
    <MenuBarExtra.Submenu key={index} title={ncaaDay.title}>
      {ncaaDay.games.map((game, gameIndex) => (
        <MenuBarExtra.Item key={gameIndex} title={game.title} onAction={game.onAction} />
      ))}
    </MenuBarExtra.Submenu>
  ));

  // Fetch MLB Games

  const { data: mlbScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  );

  const mlbGames = mlbScoresAndSchedule?.events || [];
  const mlbItems = mlbGames.map((mlbGame, index) => {
    const gameTime = new Date(mlbGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    function getPeriodWithSuffix(period) {
      if (period === 1) return `${period}st`;
      if (period === 2) return `${period}nd`;
      if (period === 3) return `${period}rd`;
      if (period >= 4 && period <= 9) return `${period}th`;
      return `${period}`;
    }

    const period = mlbGame.status.period;
    const periodWithSuffix = getPeriodWithSuffix(period);

    let title = `${mlbGame.shortName} - ${gameTime}`;

    if (mlbGame.status.type.state === "in") {
      title = `${mlbGame.competitions[0].competitors[1].team.abbreviation} ${mlbGame.competitions[0].competitors[1].score} - ${mlbGame.competitions[0].competitors[0].team.abbreviation} ${mlbGame.competitions[0].competitors[0].score}     ${periodWithSuffix} ${mlbGame.status.displayClock}`;
    }

    if (mlbGame.status.type.state === "post") {
      title = `${mlbGame.competitions[0].competitors[1].team.abbreviation} ${mlbGame.competitions[0].competitors[1].score} - ${mlbGame.competitions[0].competitors[0].team.abbreviation} ${mlbGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (mlbGame.status.type.state === "post" && mlbGame.status.type.completed === false) {
      title = `${mlbGame.competitions[0].competitors[1].team.abbreviation} - ${mlbGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} onAction={() => open("")} />;
  });

  const mlbGamesDate = mlbScoresAndSchedule.day.date;

  // Fetch F1 Races

  const { data: f1ScoresAndSchedule } = useFetch("https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard");

  const f1Races = f1ScoresAndSchedule?.events || [];
  const f1Items = f1Races.map((f1Race, index) => {
    const gameTime = new Date(f1Race.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let title = `${f1Race.shortName} - ${gameTime}`;

    if (f1Race.status.type.state === "in") {
      title = `${f1Race.shortName}    ${f1Race.competitions[4].competitors[0].athlete.shortName}   L${f1Race.competitions[4].status.period}`;
    }

    if (f1Race.status.type.state === "post") {
      title = `${f1Race.shortName}    1st: ${f1Race.competitions[4].competitors[0].athlete.shortName} (Final)`;
    }

    if (f1Race.status.type.state === "post" && f1Race.status.type.completed === false) {
      title = `${f1Race.competitions[0].competitors[1].team.abbreviation} - ${f1Race.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} onAction={() => open("")} />;
  });

  const f1GamesDate = f1ScoresAndSchedule.day.date;

  // Fetch EPL Games

  const { data: eplScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/ENG.1/scoreboard",
  );

  const eplGames = eplScoresAndSchedule?.events || [];
  const eplItems = eplGames.map((eplGame, index) => {
    const gameTime = new Date(eplGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    function getSoccerHalfWithSuffix(half) {
      if (half === 1) return `${half}st Half`;
      if (half === 2) return `${half}nd Half`;
      return `${half} Half`;
    }

    const half = eplGame.status.period;
    const halfWithSuffix = getSoccerHalfWithSuffix(half);

    let title = `${eplGame.shortName} - ${gameTime}`;

    if (eplGame.status.type.state === "in") {
      title = `${eplGame.competitions[0].competitors[1].team.abbreviation} ${eplGame.competitions[0].competitors[1].score} - ${eplGame.competitions[0].competitors[0].team.abbreviation} ${eplGame.competitions[0].competitors[0].score}     ${halfWithSuffix} ${eplGame.status.displayClock}`;
    }

    if (eplGame.status.type.state === "post") {
      title = `${eplGame.competitions[0].competitors[1].team.abbreviation} ${eplGame.competitions[0].competitors[1].score} - ${eplGame.competitions[0].competitors[0].team.abbreviation} ${eplGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (eplGame.status.type.state === "post" && eplGame.status.type.completed === false) {
      title = `${eplGame.competitions[0].competitors[1].team.abbreviation} - ${eplGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} onAction={() => open("")} />;
  });

  // Fetch SLL Games

  const { data: sllScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/ESP.1/scoreboard",
  );

  const sllGames = sllScoresAndSchedule?.events || [];
  const sllItems = sllGames.map((sllGame, index) => {
    const gameTime = new Date(sllGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    function getSoccerHalfWithSuffix(half) {
      if (half === 1) return `${half}st Half`;
      if (half === 2) return `${half}nd Half`;
      return `${half} Half`;
    }

    const half = sllGame.status.period;
    const halfWithSuffix = getSoccerHalfWithSuffix(half);

    let title = `${sllGame.shortName} - ${gameTime}`;

    if (sllGame.status.type.state === "in") {
      title = `${sllGame.competitions[0].competitors[1].team.abbreviation} ${sllGame.competitions[0].competitors[1].score} - ${sllGame.competitions[0].competitors[0].team.abbreviation} ${sllGame.competitions[0].competitors[0].score}     ${halfWithSuffix} ${sllGame.status.displayClock}`;
    }

    if (sllGame.status.type.state === "post") {
      title = `${sllGame.competitions[0].competitors[1].team.abbreviation} ${sllGame.competitions[0].competitors[1].score} - ${sllGame.competitions[0].competitors[0].team.abbreviation} ${sllGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (sllGame.status.type.state === "post" && sllGame.status.type.completed === false) {
      title = `${sllGame.competitions[0].competitors[1].team.abbreviation} - ${sllGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} onAction={() => open("")} />;
  });

  // Fetch GER Games
  const { data: gerScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/GER.1/scoreboard",
  );

  const gerGames = gerScoresAndSchedule?.events || [];
  const gerItems = gerGames.map((gerGame, index) => {
    const gameTime = new Date(gerGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    function getSoccerHalfWithSuffix(half) {
      if (half === 1) return `${half}st Half`;
      if (half === 2) return `${half}nd Half`;
      return `${half} Half`;
    }

    const half = gerGame.status.period;
    const halfWithSuffix = getSoccerHalfWithSuffix(half);

    let title = `${gerGame.shortName} - ${gameTime}`;

    if (gerGame.status.type.state === "in") {
      title = `${gerGame.competitions[0].competitors[1].team.abbreviation} ${gerGame.competitions[0].competitors[1].score} - ${gerGame.competitions[0].competitors[0].team.abbreviation} ${gerGame.competitions[0].competitors[0].score}     ${halfWithSuffix} ${gerGame.status.displayClock}`;
    }

    if (gerGame.status.type.state === "post") {
      title = `${gerGame.competitions[0].competitors[1].team.abbreviation} ${gerGame.competitions[0].competitors[1].score} - ${gerGame.competitions[0].competitors[0].team.abbreviation} ${gerGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (gerGame.status.type.state === "post" && gerGame.status.type.completed === false) {
      title = `${gerGame.competitions[0].competitors[1].team.abbreviation} - ${gerGame.competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} onAction={() => open("")} />;
  });

  // Fetch ITA Games

  const { data: itaScoresAndSchedule } = useFetch(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/ITA.1/scoreboard",
  );

  const itaGames = itaScoresAndSchedule?.events || [];
  const itaItems = itaGames.map((itaGame, index) => {
    const gameTime = new Date(itaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    function getSoccerHalfWithSuffix(half) {
      if (half === 1) return `${half}st Half`;
      if (half === 2) return `${half}nd Half`;
      return `${half} Half`;
    }

    const half = itaGame.status.period;
    const halfWithSuffix = getSoccerHalfWithSuffix(half);

    let title = `${itaGame.shortName} - ${gameTime}`;

    if (itaGame.status.type.state === "in") {
      title = `${itaGame.competitions[0].competitors[1].team.abbreviation} ${itaGame.competitions[0].competitors[1].score} - ${itaGame.competitions[0].competitors[0].team.abbreviation} ${itaGame.competitions[0].competitors[0].score}     ${halfWithSuffix} ${itaGame.status.displayClock}`;
    }

    if (itaGame.status.type.state === "post") {
      title = `${itaGame.competitions[0].competitors[1].team.abbreviation} ${itaGame.competitions[0].competitors[1].score} - ${itaGame.competitions[0].competitors[0].team.abbreviation} ${itaGame.competitions[0].competitors[0].score} (Final)`;
    }

    if (itaGame.status.type.state === "post" && itaGame.status.type.completed === false) {
      title = `${itaGame.competitions[0].competitors[1].team.abbreviation} - ${itaGame.competitions[0].competitors[0].team.abbreviation} (Postponed)`;
    }

    return <MenuBarExtra.Item key={index} title={`${title}`} onAction={() => open("")} />;
  });

  const eplGamesDate = eplScoresAndSchedule.day.date;
  const sllGamesDate = sllScoresAndSchedule.day.date;
  const gerGamesDate = gerScoresAndSchedule.day.date;
  const itaGamesDate = itaScoresAndSchedule.day.date;

  return (
    <MenuBarExtra icon={Icon.Livestream}>
      <MenuBarExtra.Submenu title="NHL Games">
        <MenuBarExtra.Section title={`${nhlGamesDate}`}></MenuBarExtra.Section>
        {nhlItems}{" "}
      </MenuBarExtra.Submenu>

      <MenuBarExtra.Submenu title="Basketball Games">
        <MenuBarExtra.Section title={`NBA - ${nbaGamesDate}`}></MenuBarExtra.Section>
        {nbaItems}

        <MenuBarExtra.Separator></MenuBarExtra.Separator>

        <MenuBarExtra.Section title={`WNBA - ${wnbaGamesDate}`}></MenuBarExtra.Section>
        {wnbaItems}
      </MenuBarExtra.Submenu>

      <MenuBarExtra.Submenu title="NCAA Basketball Games">
        <MenuBarExtra.Section title={`MNCAA ${mncaaGamesDate}`}></MenuBarExtra.Section>
        {mncaaItems}

        <MenuBarExtra.Separator></MenuBarExtra.Separator>

        <MenuBarExtra.Section title={`WNCAA ${wncaaGamesDate}`}></MenuBarExtra.Section>
        {wncaaItems}
      </MenuBarExtra.Submenu>

      <MenuBarExtra.Submenu title="NFL Games">{nflItems}</MenuBarExtra.Submenu>

      <MenuBarExtra.Submenu title="NCAA Football Games">{ncaaItems}</MenuBarExtra.Submenu>

      <MenuBarExtra.Submenu title="MLB Games">
        <MenuBarExtra.Section title={`${mlbGamesDate}`}></MenuBarExtra.Section>
        {mlbItems}
      </MenuBarExtra.Submenu>

      <MenuBarExtra.Submenu title="F1 Races">
        <MenuBarExtra.Section title={`${f1GamesDate}`}></MenuBarExtra.Section>
        {f1Items}
      </MenuBarExtra.Submenu>

      <MenuBarExtra.Submenu title="Soccer Games">
        <MenuBarExtra.Submenu title="EPL Games">
          <MenuBarExtra.Section title={`${eplGamesDate}`}></MenuBarExtra.Section>
          {eplItems}
        </MenuBarExtra.Submenu>

        <MenuBarExtra.Submenu title="SLL Games">
          <MenuBarExtra.Section title={`${sllGamesDate}`}></MenuBarExtra.Section>
          {sllItems}
        </MenuBarExtra.Submenu>

        <MenuBarExtra.Submenu title="GER Games">
          <MenuBarExtra.Section title={`${gerGamesDate}`}></MenuBarExtra.Section>
          {gerItems}
        </MenuBarExtra.Submenu>

        <MenuBarExtra.Submenu title="ITA Games">
          <MenuBarExtra.Section title={`${itaGamesDate}`}></MenuBarExtra.Section>
          {itaItems}
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Submenu>
    </MenuBarExtra>
  );
}
