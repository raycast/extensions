import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeAgent } from "./oauth";
import { Timeslip } from "./types";
import { fetchTimeslips } from "./services/freeagent";
import { parseDate, getProjectDisplayName, getTaskDisplayName, getUserDisplayName } from "./utils/formatting";
import { useFreeAgent } from "./hooks/useFreeAgent";

const ListTimeslips = function Command() {
  const [timeslips, setTimeslips] = useState<Timeslip[]>([]);
  const { isLoading, isAuthenticated, accessToken, handleError } = useFreeAgent();

  useEffect(() => {
    async function loadTimeslips() {
      if (!isAuthenticated || !accessToken) return;

      try {
        const timeslipList = await fetchTimeslips(accessToken, "all", true);
        setTimeslips(timeslipList);
      } catch (error) {
        handleError(error, "Failed to fetch timeslips");
      }
    }

    loadTimeslips();
  }, [isAuthenticated, accessToken]);

  return (
    <List isLoading={isLoading}>
      {timeslips.length === 0 && !isLoading ? (
        <List.EmptyView title="No timeslips found" description="You don't have any timeslips yet." />
      ) : (
        timeslips.map((timeslip) => {
          const projectName = getProjectDisplayName(timeslip.project);
          const taskName = getTaskDisplayName(timeslip.task);
          const userName = getUserDisplayName(timeslip.user);
          const projectUrl = typeof timeslip.project === "string" ? timeslip.project : timeslip.project.url;
          const taskUrl = typeof timeslip.task === "string" ? timeslip.task : timeslip.task.url;
          const userUrl = typeof timeslip.user === "string" ? timeslip.user : timeslip.user.url;

          return (
            <List.Item
              key={timeslip.url}
              icon={Icon.Clock}
              title={taskName}
              subtitle={`${projectName} • ${userName}${timeslip.comment ? ` • ${timeslip.comment}` : ""}`}
              accessories={[{ text: `${timeslip.hours}h` }, { date: parseDate(timeslip.dated_on) }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Project Uri" content={projectUrl} />
                  <Action.CopyToClipboard title="Copy Task Uri" content={taskUrl} icon={Icon.CheckList} />
                  <Action.CopyToClipboard title="Copy User Uri" content={userUrl} icon={Icon.Person} />
                  <Action.CopyToClipboard title="Copy Hours" content={timeslip.hours} icon={Icon.Clock} />
                  {timeslip.comment && (
                    <Action.CopyToClipboard title="Copy Comment" content={timeslip.comment} icon={Icon.Text} />
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
};

export default authorizedWithFreeAgent(ListTimeslips);
