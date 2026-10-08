import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import TeardownDetail from "./teardown-detail";
import { API_URL } from "./api";
import { TeardownResponse } from "./types";
import { registrationUrl, teardownArchiveUrl } from "./urls";

export default function TeardownOfTheDay() {
  const { data, isLoading, error, revalidate } = useFetch<TeardownResponse>(
    `${API_URL}?sort=newest&limit=1`,
    { failureToastOptions: { title: "Couldn’t load today’s teardown" } },
  );
  const teardown = data?.results?.[0];

  if (teardown) return <TeardownDetail teardown={teardown} source="daily" />;
  return (
    <Detail
      isLoading={isLoading}
      markdown={
        isLoading
          ? ""
          : error
            ? "## Couldn’t load today’s teardown\n\nPlease try again."
            : "## No teardown available yet\n\nPlease try again later."
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={revalidate} />
          <Action.OpenInBrowser
            title="Browse Teardowns on Website"
            url={teardownArchiveUrl("daily")}
          />
          <Action.OpenInBrowser
            title="Explore Validated Ideas Free"
            url={registrationUrl("daily")}
          />
        </ActionPanel>
      }
    />
  );
}
