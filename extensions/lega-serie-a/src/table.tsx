import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getStandings, getStandingsV3 } from "./api";
import SeasonDropdown, { seasons } from "./components/season_dropdown";
import StandingLegacy from "./components/standing_legacy";
import StandingV3 from "./components/standing";

export default function GetTables() {
  const [season, setSeason] = useState<string>(seasons[0]);

  const isV3 = season.split("_").length === 3;

  const TableComponent = isV3 ? StandingV3 : StandingLegacy;

  const { data: standing, isLoading } = isV3
    ? usePromise(getStandingsV3, [season])
    : usePromise(getStandings, [season]);

  return (
    <List
      throttle
      isLoading={isLoading}
      searchBarAccessory={
        <SeasonDropdown selected={season} onSelect={setSeason} />
      }
      isShowingDetail={true}
    >
      <TableComponent standing={standing} />
    </List>
  );
}
