import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";

type DataView = {
  id: number;
  name: string;
};
type Lead = {
  id: number;
  name: string;
  last_visited_at: string;
  time_on_page: string;
  pages_viewed: number;
  source: string;
  industry: string[];
  country: string;
  state: string;
  city: string;
  website: string | null;
  logo: string;
};
type Contact = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  linkedin: string | null;
  twitter: string | null;
  phone_number: string | null;
};

const { api_key } = getPreferenceValues<Preferences>();
const API_URL = "https://www.visitorqueue.com/api/v1/";
const headers = {
  Accept: "application/json",
  Authorization: `Token ${api_key}`,
};

export default function DataViews() {
  const { isLoading, data: views } = useFetch(API_URL + "ga_views", {
    headers,
    async parseResponse(response) {
      const result = await response.json();
      if (!response.ok) throw new Error((result as { message: string }).message);
      return result as DataView[];
    },
    initialData: [],
  });
  return (
    <List isLoading={isLoading}>
      {views.map((view) => (
        <List.Item
          key={view.id}
          icon="extension_icon.png"
          title={view.name}
          subtitle={view.id.toString()}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.House} title="Leads" target={<Leads gaViewId={view.id} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function formatDateString(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(new Date(date));
}

function Leads({ gaViewId }: { gaViewId: number }) {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-lead-details", false);
  const {
    isLoading,
    data: leads,
    pagination,
  } = useFetch((options) => API_URL + `leads?ga_view_id=${gaViewId}&page=${options.page + 1}`, {
    headers,
    async parseResponse(response) {
      const result = await response.json();
      if (!response.ok) throw new Error((result as { message: string }).message);

      const page = Number(response.headers.get("Page"));
      const perPage = Number(response.headers.get("Per-Page"));
      const total = Number(response.headers.get("Total"));

      const totalPagesNeeded = Math.ceil(total / perPage);
      const hasMore = page < totalPagesNeeded;

      return {
        data: result as Lead[],
        hasMore,
      };
    },
    mapResult(result) {
      return {
        data: result.data,
        hasMore: result.hasMore,
      };
    },
    initialData: [],
  });
  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} pagination={pagination}>
      {leads.map((lead) => (
        <List.Item
          key={lead.id}
          icon={lead.logo}
          title={lead.name}
          subtitle={isShowingDetail ? undefined : `${lead.city}, ${lead.state}, ${lead.country}`}
          accessories={
            isShowingDetail
              ? undefined
              : [
                  { icon: Icon.Eye, text: lead.pages_viewed.toString(), tooltip: `Views: ${lead.pages_viewed}` },
                  { icon: Icon.Clock, text: lead.time_on_page, tooltip: `Time spent: ${lead.time_on_page}` },
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label icon={Icon.Pin} title="City" text={lead.city} />
                  <List.Item.Detail.Metadata.Label icon={Icon.Pin} title="State" text={lead.state} />
                  <List.Item.Detail.Metadata.Label icon={Icon.Pin} title="Country" text={lead.country} />
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Visit Details" />
                  <List.Item.Detail.Metadata.Label
                    icon={Icon.Calendar}
                    title="Last Visited"
                    text={formatDateString(lead.last_visited_at)}
                  />
                  <List.Item.Detail.Metadata.Label icon={Icon.Eye} title="Views" text={lead.pages_viewed.toString()} />
                  <List.Item.Detail.Metadata.Label icon={Icon.Clock} title="Time Spent" text={lead.time_on_page} />
                  <List.Item.Detail.Metadata.TagList title="Source">
                    <List.Item.Detail.Metadata.TagList.Item icon={Icon.Globe} text={lead.source} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Company Information" />
                  <List.Item.Detail.Metadata.Label icon={Icon.Building} title="Company Name" text={lead.name} />
                  {lead.website ? (
                    <List.Item.Detail.Metadata.Link title="Website" text={lead.website} target={lead.website} />
                  ) : (
                    <List.Item.Detail.Metadata.Label icon={Icon.Globe} title="Website" text="N/A" />
                  )}
                  <List.Item.Detail.Metadata.TagList title="Industry">
                    {lead.industry.map((i) => (
                      <List.Item.Detail.Metadata.TagList.Item key={i} text={i} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.AppWindowSidebarLeft}
                title="Toggle Details"
                onAction={() => setIsShowingDetail((show) => !show)}
              />
              <Action.Push icon={Icon.Person} title="Contacts" target={<Contacts lead={lead} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function slugify(str: string) {
  return str
    .toLowerCase() // Convert to lowercase
    .trim() // Trim whitespace from both ends
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w-]+/g, "") // Remove all non-word characters (except for hyphens)
    .replace(/--+/g, "-"); // Replace multiple hyphens with a single hyphen
}

function Contacts({ lead }: { lead: Lead }) {
  const { isLoading, data: contacts } = useFetch(API_URL + `contacts?lead_id=${lead.id}`, {
    headers,
    async parseResponse(response) {
      const result = await response.json();
      if (!response.ok) throw new Error((result as { message: string }).message);
      return result as Contact[];
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {!isLoading && !contacts.length ? (
        <List.EmptyView
          icon="linkedin.svg"
          title="Find contacts on LinkedIn"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon="linkedin.svg"
                title="People Search"
                url={`https://www.linkedin.com/search/results/people/?company=${slugify(lead.name)}`}
              />
              <Action.OpenInBrowser
                icon="linkedin.svg"
                title="Sales Navigator"
                url={`https://www.linkedin.com/sales/search/people?companyIncluded=${slugify(lead.name)}&companyTimeS`}
              />
            </ActionPanel>
          }
        />
      ) : (
        contacts.map((contact) => <List.Item key={contact.email} icon={Icon.Person} title={contact.email} />)
      )}
    </List>
  );
}
