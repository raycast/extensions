import { Action, ActionPanel, Color, Detail, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getVisitor, listVisitors } from "./datafast";
import { formatCurrency, formatDate, formatNumber, formatPercent, truncate } from "./format";
import type { VisitorDetail, VisitorListRow } from "./types";

type VisitorFilters = {
  visitedPageContains?: string;
  completedGoal?: string;
  country?: string;
  device?: string;
  browser?: string;
  utm_campaign?: string;
  referrer?: string;
  isCustomer?: boolean;
};

export default function Command() {
  const [filters, setFilters] = useState<VisitorFilters>({});
  const [visitors, setVisitors] = useState<VisitorListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setVisitors(await listVisitors(filters));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load visitors.";
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load visitors", message });
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterSummary = useMemo(() => summarizeFilters(filters), [filters]);

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Filter loaded visitors...">
      {error ? (
        <List.EmptyView
          title="Could Not Load Visitors"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={load} />
              <Action.Push title="Edit Search" target={<VisitorSearchForm filters={filters} onSubmit={setFilters} />} />
            </ActionPanel>
          }
        />
      ) : null}

      <List.Section title="Search" subtitle={filterSummary}>
        <List.Item
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          title="Edit Visitor Search"
          subtitle={filterSummary}
          detail={<List.Item.Detail markdown={`# Visitor Search\n\n${filterSummary}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Edit Search" target={<VisitorSearchForm filters={filters} onSubmit={setFilters} />} />
              <Action title="Refresh" onAction={load} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Visitors" subtitle={`${formatNumber(visitors.length)} loaded`}>
        {visitors.map((visitor) => (
          <List.Item
            key={visitor.visitorId}
            icon={{ source: Icon.Person, tintColor: Color.Green }}
            title={visitor.visitorId}
            subtitle={getVisitorSubtitle(visitor)}
            accessories={[
              { text: visitor.identity?.device || "" },
              { text: visitor.identity?.country || "" },
              { date: visitor.lastSeenAt ? new Date(visitor.lastSeenAt) : undefined },
            ].filter((accessory) => Boolean(accessory.text || accessory.date))}
            detail={<List.Item.Detail markdown={visitorSummaryMarkdown(visitor)} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Visitor Details"
                  target={<VisitorDetailView visitorId={visitor.visitorId} />}
                />
                {visitor.currentUrl ? (
                  <Action.OpenInBrowser title="Open Current URL" url={normalizeUrl(visitor.currentUrl)} />
                ) : null}
                <Action.CopyToClipboard title="Copy Visitor Id" content={visitor.visitorId} />
                <Action.CopyToClipboard title="Copy Visitor JSON" content={JSON.stringify(visitor, null, 2)} />
                <Action title="Refresh" onAction={load} />
                <Action.Push
                  title="Edit Search"
                  target={<VisitorSearchForm filters={filters} onSubmit={setFilters} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function VisitorSearchForm(props: { filters: VisitorFilters; onSubmit: (filters: VisitorFilters) => void }) {
  const { pop } = useNavigation();

  function handleSubmit(values: {
    visitedPageContains: string;
    completedGoal: string;
    country: string;
    device: string;
    browser: string;
    utm_campaign: string;
    referrer: string;
    isCustomer: string;
  }) {
    props.onSubmit({
      visitedPageContains: emptyToUndefined(values.visitedPageContains),
      completedGoal: emptyToUndefined(values.completedGoal),
      country: emptyToUndefined(values.country),
      device: emptyToUndefined(values.device),
      browser: emptyToUndefined(values.browser),
      utm_campaign: emptyToUndefined(values.utm_campaign),
      referrer: emptyToUndefined(values.referrer),
      isCustomer: values.isCustomer === "any" ? undefined : values.isCustomer === "true",
    });
    pop();
  }

  return (
    <Form
      navigationTitle="Search Visitors"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search Visitors" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="visitedPageContains"
        title="Page Contains"
        placeholder="/pricing"
        defaultValue={props.filters.visitedPageContains}
      />
      <Form.TextField
        id="completedGoal"
        title="Completed Goal"
        placeholder="signup"
        defaultValue={props.filters.completedGoal}
      />
      <Form.TextField
        id="country"
        title="Country"
        placeholder="US, Canada, France"
        defaultValue={props.filters.country}
      />
      <Form.Dropdown id="device" title="Device" defaultValue={props.filters.device ?? ""}>
        <Form.Dropdown.Item title="Any Device" value="" />
        <Form.Dropdown.Item title="Desktop" value="desktop" />
        <Form.Dropdown.Item title="Mobile" value="mobile" />
        <Form.Dropdown.Item title="Tablet" value="tablet" />
      </Form.Dropdown>
      <Form.TextField id="browser" title="Browser" placeholder="Chrome" defaultValue={props.filters.browser} />
      <Form.TextField
        id="utm_campaign"
        title="UTM Campaign"
        placeholder="launch"
        defaultValue={props.filters.utm_campaign}
      />
      <Form.TextField id="referrer" title="Referrer" placeholder="Google" defaultValue={props.filters.referrer} />
      <Form.Dropdown
        id="isCustomer"
        title="Customer"
        defaultValue={props.filters.isCustomer === undefined ? "any" : String(props.filters.isCustomer)}
      >
        <Form.Dropdown.Item title="Any" value="any" />
        <Form.Dropdown.Item title="Customers Only" value="true" />
        <Form.Dropdown.Item title="Non-Customers Only" value="false" />
      </Form.Dropdown>
    </Form>
  );
}

function VisitorDetailView(props: { visitorId: string }) {
  const [visitor, setVisitor] = useState<VisitorDetail>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setVisitor(await getVisitor(props.visitorId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load visitor.";
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load visitor", message });
    } finally {
      setIsLoading(false);
    }
  }, [props.visitorId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={error ? `# Could Not Load Visitor\n\n${error}` : visitorDetailMarkdown(visitor, props.visitorId)}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={load} />
          <Action.CopyToClipboard title="Copy Visitor Id" content={props.visitorId} />
          {visitor ? (
            <Action.CopyToClipboard title="Copy Visitor JSON" content={JSON.stringify(visitor, null, 2)} />
          ) : null}
          {visitor?.activity?.currentUrl ? (
            <Action.OpenInBrowser title="Open Current URL" url={normalizeUrl(visitor.activity.currentUrl)} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function visitorSummaryMarkdown(visitor: VisitorListRow): string {
  const acquisition = Object.entries(visitor.acquisition ?? {}).filter(([, value]) => value);

  return [
    `# ${visitor.visitorId}`,
    "",
    visitor.currentUrl ? `**Current URL:** ${visitor.currentUrl}` : undefined,
    `**Last seen:** ${formatDate(visitor.lastSeenAt)}`,
    "",
    "## Identity",
    "",
    `- Country: ${visitor.identity?.country || "Unknown"}`,
    `- Region: ${visitor.identity?.region || "Unknown"}`,
    `- City: ${visitor.identity?.city || "Unknown"}`,
    `- Browser: ${visitor.identity?.browser || "Unknown"}`,
    `- OS: ${visitor.identity?.os || "Unknown"}`,
    `- Device: ${visitor.identity?.device || "Unknown"}`,
    acquisition.length > 0 ? "\n## Acquisition\n" : undefined,
    ...acquisition.map(([key, value]) => `- ${key}: ${value}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function visitorDetailMarkdown(visitor: VisitorDetail | undefined, visitorId: string): string {
  if (!visitor) {
    return `# ${visitorId}`;
  }

  const goals = visitor.activity?.completedGoals ?? [];
  const pages = visitor.activity?.visitedPages ?? [];
  const metadata = visitor.profile?.metadata ? JSON.stringify(visitor.profile.metadata, null, 2) : undefined;

  return [
    `# ${visitor.visitorId}`,
    "",
    visitor.profile?.userId ? `**User:** ${visitor.profile.userId}` : undefined,
    visitor.activity?.currentUrl ? `**Current URL:** ${visitor.activity.currentUrl}` : undefined,
    `**Last visit:** ${formatDate(visitor.activity?.lastVisitAt)}`,
    visitor.prediction?.score !== undefined
      ? `**Prediction score:** ${formatNumber(visitor.prediction.score)}/100`
      : undefined,
    "",
    "## Activity",
    "",
    `- Visits: ${formatNumber(visitor.activity?.visitCount)}`,
    `- Pageviews: ${formatNumber(visitor.activity?.pageViewCount)}`,
    `- First visit: ${formatDate(visitor.activity?.firstVisitAt)}`,
    `- Last visit: ${formatDate(visitor.activity?.lastVisitAt)}`,
    "",
    "## Identity",
    "",
    `- Location: ${[visitor.identity?.city, visitor.identity?.region, visitor.identity?.country || visitor.identity?.countryCode].filter(Boolean).join(", ") || "Unknown"}`,
    `- Browser: ${[visitor.identity?.browser?.name, visitor.identity?.browser?.version].filter(Boolean).join(" ") || "Unknown"}`,
    `- OS: ${[visitor.identity?.os?.name, visitor.identity?.os?.version].filter(Boolean).join(" ") || "Unknown"}`,
    `- Device: ${[visitor.identity?.device?.type, visitor.identity?.device?.vendor, visitor.identity?.device?.model].filter(Boolean).join(" ") || "Unknown"}`,
    visitor.prediction ? "\n## Prediction\n" : undefined,
    visitor.prediction ? `- Conversion rate: ${formatPercent(visitor.prediction.conversionRate)}` : undefined,
    visitor.prediction ? `- Expected value: ${formatCurrency(visitor.prediction.expectedValue, "USD")}` : undefined,
    visitor.prediction ? `- Confidence: ${formatPercent((visitor.prediction.confidence ?? 0) * 100)}` : undefined,
    metadata ? "\n## Profile Metadata\n" : undefined,
    metadata ? `\`\`\`json\n${metadata}\n\`\`\`` : undefined,
    goals.length > 0 ? "\n## Completed Goals\n" : undefined,
    ...goals
      .slice(0, 20)
      .map((goal) => `- ${goal.name || "Goal"} (${goal.type || "custom"}) - ${formatDate(goal.timestamp)}`),
    pages.length > 0 ? "\n## Recent Pages\n" : undefined,
    ...pages.slice(0, 30).map((page) => `- ${formatDate(page.timestamp)} - ${page.url || ""}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function summarizeFilters(filters: VisitorFilters): string {
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) {
    return "No filters";
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join(", ");
}

function getVisitorSubtitle(visitor: VisitorListRow): string {
  return (
    [visitor.identity?.city, visitor.identity?.country, visitor.identity?.browser, visitor.identity?.device]
      .filter(Boolean)
      .join(" / ") || truncate(visitor.currentUrl, 80)
  );
}

function normalizeUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
