import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, getFavicon, useCachedPromise, useForm, useLocalStorage } from "@raycast/utils";
import { subDays, subHours } from "date-fns";
import { useState } from "react";

const getSiteMetrics = async (id: string, date_range: string | string[]) => {
  const { api_key } = getPreferenceValues<Preferences>();
  const response = await fetch("https://api.onedollarstats.com/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": api_key,
    },
    body: JSON.stringify({
      site_id: id,
      metrics: ["pageviews", "visits", "visitors", "visit_duration", "bounce_rate"],
      date_range,
    }),
  });
  const result = await response.json();
  const err = result as
    { message: string } | { success: false; error: { name: string; issues: Array<{ code: string; message: string }> } };
  if (!response.ok) throw new Error("message" in err ? err.message : err.error.issues[0].message);
  return result as { results: Array<{ metrics: number[] }>; query: { site_id: string } };
};

export default function SearchWebsites() {
  const [dateRange, setDateRange] = useState("day");
  const { isLoading, data: websites } = useCachedPromise(
    async (dateRange: string) => {
      const value = await LocalStorage.getItem<string>("ODS-WEBSITES");
      const ids: string[] = await JSON.parse(value ?? "[]");

      const val = +dateRange.slice(0, -1);
      const unit = dateRange.at(-1);
      const endDate = new Date();

      const date_range =
        dateRange === "day"
          ? "day"
          : unit === "h"
            ? [subHours(endDate, val).toISOString(), endDate.toISOString()]
            : [subDays(endDate, val).toISOString(), endDate.toISOString()];

      const results = await Promise.all(ids.map((id) => getSiteMetrics(id, date_range)));
      return results;
    },
    [dateRange],
    {
      initialData: [],
    },
  );

  const isShowingDetail = !isLoading && !!websites.length;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="" onChange={setDateRange}>
          <List.Dropdown.Item icon={Icon.Calendar} title="Today" value="day" />
          <List.Dropdown.Section>
            <List.Dropdown.Item icon={Icon.Calendar} title="Last 24 hours" value="24h" />
            <List.Dropdown.Item icon={Icon.Calendar} title="Last 48 hours" value="48h" />
            <List.Dropdown.Item icon={Icon.Calendar} title="Last 72 hours" value="72h" />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            <List.Dropdown.Item icon={Icon.Calendar} title="Last 7 days" value="7d" />
            <List.Dropdown.Item icon={Icon.Calendar} title="Last 14 days" value="14d" />
            <List.Dropdown.Item icon={Icon.Calendar} title="Last 30 days" value="30d" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && !websites.length ? (
        <List.EmptyView
          icon="extension_icon.png"
          title="Enter a Site ID"
          description="Add a site in ODS then enter the id"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Website" target={<AddWebsite />} />
            </ActionPanel>
          }
        />
      ) : (
        websites.map((website) => (
          <List.Item
            key={website.query.site_id}
            icon={getFavicon(`https://${website.query.site_id}`)}
            title={website.query.site_id}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Page Views" text={`${website.results[0].metrics[0]}`} />
                    <List.Item.Detail.Metadata.Label title="Vists" text={`${website.results[0].metrics[1]}`} />
                    <List.Item.Detail.Metadata.Label title="Visitors" text={`${website.results[0].metrics[2]}`} />
                    <List.Item.Detail.Metadata.Label
                      title="Visit Duration"
                      text={`${Math.round(website.results[0].metrics[3])}s`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Bounce Rate"
                      text={`${Math.round(website.results[0].metrics[4])}%`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon="extension_icon.png"
                  title="Open in ODS"
                  url={`https://onedollarstats.com/analytics/dashboard/${website.query.site_id}`}
                />
                <Action.OpenInBrowser
                  icon={getFavicon(`https://${website.query.site_id}`)}
                  url={`https://${website.query.site_id}`}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddWebsite() {
  const { isLoading, value: ids = [], setValue } = useLocalStorage<string[]>("ODS-WEBSITES");

  const { handleSubmit, itemProps } = useForm<{ domain: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Verifying");
      try {
        if (ids.includes(values.domain)) throw new Error("Site already added");
        await getSiteMetrics(values.domain, "day");
        toast.title = "Adding";
        await setValue([...ids, values.domain]);
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `${error}`;
      }
    },
    validation: {
      domain: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="unexpected.app" {...itemProps.domain} />
    </Form>
  );
}
