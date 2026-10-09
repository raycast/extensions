import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, LocalStorage } from "@raycast/api";
import { demoOverview, formatMetric, periodLabel, Project, RevenueCatClient } from "./lib/revenuecat";
import { demoProject } from "./lib/demo";
import { useResource } from "./hooks/data";
import { Catalog } from "./components/catalog";
import { Customers } from "./components/customers";
import { Trends } from "./components/trends";
import { authorize, credential } from "./lib/auth";
import { ProjectContext, ProjectDropdown, SELECTED_PROJECT_KEY } from "./components/projects";
import { CommonActions, Context, SettingsAction } from "./components/common";

function Home({ context }: { context: Context }) {
  const state = useResource(`${context.project.id}:overview:${context.currency}:${context.demo}`, (signal) =>
    context.demo
      ? Promise.resolve({ ...demoOverview, currency: context.currency })
      : new RevenueCatClient(context.apiKey).overview(context.project.id, context.currency, signal),
  );
  const data = state.data;
  const navigation = (
    <ActionPanel.Section title="Explore">
      <Action.Push
        title="Search Customers"
        icon={Icon.TwoPeople}
        target={<Customers context={context} />}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "u" },
          Windows: { modifiers: ["ctrl", "shift"], key: "u" },
        }}
      />
      <Action.Push
        title="View Revenue Trends"
        icon={Icon.BarChart}
        target={<Trends context={context} />}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "r" },
          Windows: { modifiers: ["ctrl", "shift"], key: "r" },
        }}
      />
      <Action.Push
        title="Browse Product Catalog"
        icon={Icon.Box}
        target={<Catalog context={context} />}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "p" },
          Windows: { modifiers: ["ctrl", "shift"], key: "p" },
        }}
      />
    </ActionPanel.Section>
  );
  const order = ["mrr", "revenue", "active_subscriptions", "active_trials", "new_customers", "active_users"];
  const metrics = [...(data?.metrics || [])].sort(
    (a, b) =>
      (order.indexOf(a.id) < 0 ? 99 : order.indexOf(a.id)) - (order.indexOf(b.id) < 0 ? 99 : order.indexOf(b.id)),
  );
  const groups = [
    { title: "Revenue", ids: ["mrr", "revenue"] },
    { title: "Subscriptions", ids: ["active_subscriptions", "active_trials"] },
    { title: "Customers", ids: ["new_customers", "active_users"] },
    { title: "Other Metrics", ids: metrics.filter((metric) => !order.includes(metric.id)).map((metric) => metric.id) },
  ];
  return (
    <List
      navigationTitle="Dashboard"
      isShowingDetail
      isLoading={state.loading}
      searchBarAccessory={<ProjectDropdown context={context} />}
      searchBarPlaceholder="Filter metrics…"
    >
      <List.EmptyView
        icon={state.error ? Icon.ExclamationMark : Icon.BarChart}
        title={state.error ? "Metrics unavailable" : state.loading ? "Loading metrics…" : "No matching metrics"}
        description={state.error}
        actions={
          <ActionPanel>
            {navigation}
            <CommonActions refresh={state.refresh} />
          </ActionPanel>
        }
      />
      {groups.map((group) => {
        const items = metrics.filter((metric) => group.ids.includes(metric.id));
        if (!items.length) return null;
        return (
          <List.Section key={group.title} title={group.title}>
            {items.map((metric) => {
              const currency = data!.currency;
              const value = formatMetric(metric, currency);
              const monetary = metric.unit === "$" || metric.unit === currency;
              return (
                <List.Item
                  key={metric.id}
                  id={metric.id}
                  title={metric.id === "mrr" ? "MRR" : metric.name}
                  keywords={[
                    metric.id,
                    metric.name,
                    metric.id === "mrr" ? "Monthly Recurring Revenue" : "",
                    periodLabel(metric.period),
                  ]}
                  icon={{
                    source: monetary ? Icon.BankNote : group.title === "Customers" ? Icon.TwoPeople : Icon.BarChart,
                    tintColor: monetary ? Color.Green : metric.id.includes("trial") ? Color.Orange : Color.Blue,
                  }}
                  accessories={[{ text: value }]}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Metric"
                            text={metric.id === "mrr" ? "Monthly Recurring Revenue" : metric.name}
                          />
                          <List.Item.Detail.Metadata.Label title="Value" text={value} />
                          <List.Item.Detail.Metadata.Label title="Period" text={periodLabel(metric.period)} />
                          {metric.description && (
                            <List.Item.Detail.Metadata.Label title="Description" text={metric.description} />
                          )}
                          {monetary && <List.Item.Detail.Metadata.Label title="Currency" text={currency} />}
                          {metric.last_updated_at != null && (
                            <List.Item.Detail.Metadata.Label
                              title="Last Updated"
                              text={new Date(metric.last_updated_at).toLocaleString()}
                            />
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Metric Value" content={value} />
                      {navigation}
                      <CommonActions refresh={state.refresh} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

type RootProps = { initial?: "dashboard" | "customers" | "catalog" | "trends" };

function ConnectedRoot({ initial = "dashboard", demo = false }: RootProps & { demo?: boolean }) {
  const preferences = getPreferenceValues<Preferences>();
  const state = useResource(demo ? "demo-projects" : "projects", async (signal) => {
    if (demo) return { selected: demoProject.id, projects: [demoProject] };
    const selected = await LocalStorage.getItem<string>(SELECTED_PROJECT_KEY);
    const projects = await new RevenueCatClient(credential).projects(signal);
    return { selected, projects };
  });
  const projects: Project[] = state.data?.projects || [];
  const project = projects.find((p) => p.id === state.data?.selected) || projects[0];
  if (!project)
    return (
      <List isLoading={state.loading}>
        <List.EmptyView
          title={state.loading ? "Loading projects…" : "No accessible projects"}
          description={state.error || "Check that your RevenueCat connection has access to a project."}
          icon="revenuecat-icon.png"
          actions={
            <ActionPanel>
              <CommonActions refresh={state.refresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  const context: Context = {
    apiKey: demo
      ? async () => {
          throw new Error("Demo mode does not use live credentials.");
        }
      : credential,
    project,
    projects,
    currency: preferences.currency || "USD",
    demo,
  };
  return (
    <ProjectContext.Provider value={{ projects, selected: project.id }}>
      {initial === "customers" ? (
        <Customers context={context} />
      ) : initial === "catalog" ? (
        <Catalog context={context} />
      ) : initial === "trends" ? (
        <Trends context={context} />
      ) : (
        <Home key={project.id} context={context} />
      )}
    </ProjectContext.Provider>
  );
}

function AuthenticatedRoot(props: RootProps) {
  const account = useResource("authorization", authorize);
  if (account.loading) return <List isLoading />;
  if (account.error)
    return (
      <List>
        <List.EmptyView
          title="Could Not Connect to RevenueCat"
          description={account.error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={account.refresh} />
              <SettingsAction />
            </ActionPanel>
          }
        />
      </List>
    );
  return <ConnectedRoot {...props} />;
}

export function RevenueCatRoot(props: RootProps) {
  const { demoMode } = getPreferenceValues<Preferences>();
  return demoMode ? <ConnectedRoot {...props} demo /> : <AuthenticatedRoot {...props} />;
}

export default function Command() {
  return <RevenueCatRoot />;
}
