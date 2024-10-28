import { Action, ActionPanel, List } from "@raycast/api";
import React from "react";
import prettyMilliseconds from "pretty-ms";
import dayjs from "dayjs";

import { CharacterData } from "./types";

interface Props {
  data: CharacterData;
}

const LatestRuns: React.FC<Props> = ({ data }) => {
  return (
    <List>
      {data.mythic_plus_recent_runs.map((run, index) => (
        <List.Item
          key={`${run.mythic_level}-${index}`}
          title={`+${run.mythic_level} ${run.dungeon}`}
          subtitle={`Score: ${run.score}, Time: ${prettyMilliseconds(run.clear_time_ms, { colonNotation: true })}, Completed: ${dayjs(run.completed_at).format("MM/D/YYYY")}`}
          icon={{
            source: run.icon_url,
          }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open RaiderIO Run" url={run.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default LatestRuns;
