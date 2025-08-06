import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeagent } from "./oauth";
import { Timeslip } from "./types";
import { fetchTimeslips } from "./services/freeagent";
import { parseDate, formatUriAsName } from "./utils/formatting";
import { useFreeAgent } from "./hooks/useFreeAgent";

const ListTimeslips = function Command() {
  const [timeslips, setTimeslips] = useState<Timeslip[]>([]);
  const { isLoading, isAuthenticated, accessToken, handleError } = useFreeAgent();

  useEffect(() => {
    async function loadTimeslips() {
      if (!isAuthenticated || !accessToken) return;

      try {
        const timeslipList = await fetchTimeslips(accessToken);
        setTimeslips(timeslipList);
      } catch (error) {
        handleError(error, "Failed to fetch timeslips");
      }
    }

    loadTimeslips();
  }, [isAuthenticated, accessToken]);

  return (
    <List isLoading={isLoading}>
      {timeslips.map((timeslip) => (
        <List.Item
          key={timeslip.url}
          icon={Icon.Clock}
          title={formatUriAsName(timeslip.project)}
          subtitle={`${formatUriAsName(timeslip.task)} • ${formatUriAsName(timeslip.user)}`}
          accessories={[{ text: `${timeslip.hours}h` }, { date: parseDate(timeslip.dated_on) }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Project Uri" content={timeslip.project} />
              <Action.CopyToClipboard title="Copy Task Uri" content={timeslip.task} icon={Icon.CheckList} />
              <Action.CopyToClipboard title="Copy User Uri" content={timeslip.user} icon={Icon.Person} />
              <Action.CopyToClipboard title="Copy Hours" content={timeslip.hours} icon={Icon.Clock} />
              {timeslip.comment && (
                <Action.CopyToClipboard title="Copy Comment" content={timeslip.comment} icon={Icon.Text} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default authorizedWithFreeagent(ListTimeslips);
