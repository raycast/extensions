import { Action, ActionPanel, Detail, Icon, environment } from "@raycast/api";
import { dateKey, summarizeWeek } from "daily-karte";
import { getSession, withGoogleAccess } from "./auth";
import { ErrorView, useLoad } from "./components";
import { FirestoreClient } from "./lib/firestore";
import { calendarImage } from "./lib/calendar";

async function loadWeek() {
  const session = await getSession();
  const today = dateKey();
  const entries = await new FirestoreClient(session).week(today);
  return {
    image: calendarImage(summarizeWeek(entries, today), today, environment.appearance === "dark"),
    website: session.config.website,
  };
}

function ThisWeek() {
  const state = useLoad(loadWeek);
  if (state.error) return <ErrorView error={state.error} refresh={state.refresh} />;
  return (
    <Detail
      isLoading={state.loading}
      markdown={state.value ? `![This week's calendar](${state.value.image})` : ""}
      actions={
        <ActionPanel>
          <Action title="Refresh Calendar" icon={Icon.ArrowClockwise} onAction={state.refresh} />
          {state.value && <Action.OpenInBrowser title="Open Daily Karte" url={state.value.website} />}
        </ActionPanel>
      }
    />
  );
}

export default withGoogleAccess(ThisWeek);
