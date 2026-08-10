import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { preferences } from "./helpers/preferences";

interface Page {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  icon: Icon;
  keywords: string[];
}

const pages: Page[] = [
  {
    id: "home",
    title: "Home",
    subtitle: "Home page",
    url: "/",
    icon: Icon.House,
    keywords: ["home", "main"],
  },
  {
    id: "drilldown",
    title: "Drilldown",
    subtitle: "Configure drilldown links and actions",
    url: "/drilldown",
    icon: Icon.Link,
    keywords: ["drilldown", "links", "navigation", "actions"],
  },
  {
    id: "explore",
    title: "Explore",
    subtitle: "Query and explore your data",
    url: "/explore",
    icon: Icon.MagnifyingGlass,
    keywords: ["explore", "query", "data", "investigation"],
  },
  {
    id: "performance-monitoring",
    title: "Performance Monitoring (k6)",
    subtitle: "Load testing and performance monitoring",
    url: "/a/k6-app",
    icon: Icon.Gauge,
    keywords: ["performance", "k6", "load testing", "monitoring", "stress"],
  },
  {
    id: "synthetic-monitoring",
    title: "Synthetic Monitoring",
    subtitle: "Monitor your applications from the outside",
    url: "/a/grafana-synthetic-monitoring-app/home",
    icon: Icon.Eye,
    keywords: ["synthetic", "monitoring", "uptime", "availability", "external"],
  },
  {
    id: "assistant",
    title: "Assistant",
    subtitle: "Grafana AI Assistant for help and guidance",
    url: "/a/grafana-assistant-app?mode=assistant",
    icon: Icon.Message,
    keywords: ["assistant", "ai", "help", "guidance", "chat"],
  },
  {
    id: "irm",
    title: "IRM",
    subtitle: "Incident Response Management",
    url: "/a/grafana-irm-app",
    icon: Icon.Exclamationmark2,
    keywords: ["irm", "incident", "response", "management", "alerts", "incidents"],
  },
  {
    id: "alerting",
    title: "Alerting",
    subtitle: "Configure and manage alerts",
    url: "/alerting",
    icon: Icon.Bell,
    keywords: ["alerting", "alerts", "notifications", "rules", "channels"],
  },
  {
    id: "slo",
    title: "SLO",
    subtitle: "Service Level Objectives monitoring",
    url: "/a/grafana-slo-app/home/insights",
    icon: Icon.BullsEye,
    keywords: ["slo", "service level", "objectives", "monitoring", "reliability"],
  },
  {
    id: "advisor",
    title: "Advisor",
    subtitle: "Grafana Advisor for optimization recommendations",
    url: "/a/grafana-advisor-app",
    icon: Icon.LightBulb,
    keywords: ["advisor", "recommendations", "optimization", "best practices"],
  },
  {
    id: "cost-management",
    title: "Cost Management",
    subtitle: "Monitor and optimize cloud costs",
    url: "/a/grafana-costmanagementui-app/overview",
    icon: Icon.Coin,
    keywords: ["cost", "management", "billing", "optimization", "cloud"],
  },
  {
    id: "fleet-management",
    title: "Fleet Management",
    subtitle: "Manage Grafana Agent fleet",
    url: "/a/grafana-collector-app/fleet-management",
    icon: Icon.Gear,
    keywords: ["fleet", "management", "agents", "collectors", "monitoring"],
  },
  {
    id: "data-sources",
    title: "Data Sources",
    subtitle: "Configure and manage data sources",
    url: "/connections/datasources",
    icon: Icon.Link,
    keywords: ["data sources", "connections", "databases", "configuration"],
  },
  {
    id: "aws",
    title: "AWS",
    subtitle: "Amazon Web Services monitoring and management",
    url: "/a/grafana-csp-app/aws",
    icon: Icon.Cloud,
    keywords: ["aws", "amazon", "cloud", "ec2", "s3", "lambda"],
  },
  {
    id: "azure",
    title: "Azure",
    subtitle: "Microsoft Azure monitoring and management",
    url: "/a/grafana-csp-app/azure",
    icon: Icon.Cloud,
    keywords: ["azure", "microsoft", "cloud", "vm", "storage", "functions"],
  },
  {
    id: "gcp",
    title: "GCP",
    subtitle: "Google Cloud Platform monitoring and management",
    url: "/a/grafana-csp-app/gcp",
    icon: Icon.Cloud,
    keywords: ["gcp", "google", "cloud", "compute", "storage", "functions"],
  },
  {
    id: "kubernetes",
    title: "Kubernetes",
    subtitle: "Kubernetes cluster monitoring and management",
    url: "/a/grafana-k8s-app/home",
    icon: Icon.Cog,
    keywords: ["kubernetes", "k8s", "containers", "pods", "clusters"],
  },
  {
    id: "dashboards",
    title: "Dashboards",
    subtitle: "View and manage all dashboards",
    url: "/dashboards",
    icon: Icon.BarChart,
    keywords: ["dashboards", "visualization", "charts", "graphs"],
  },
  {
    id: "setup-guide",
    title: "Setup Guide",
    subtitle: "Grafana setup and configuration guide",
    url: "/a/grafana-setupguide-app/home",
    icon: Icon.Book,
    keywords: ["setup", "guide", "configuration", "getting started", "tutorial"],
  },
  {
    id: "service-accounts",
    title: "Service Accounts",
    subtitle: "Manage service accounts and API keys",
    url: "/org/serviceaccounts",
    icon: Icon.Person,
    keywords: ["service", "accounts", "api", "keys", "authentication"],
  },
];

export default function Command() {
  const { data: sortedPages, visitItem } = useFrecencySorting(pages);

  const getFullUrl = (url: string) => {
    // If the URL starts with http, it's already a full URL
    if (url.startsWith("http")) {
      return url;
    }
    // Otherwise, prepend the root API URL
    return preferences.rootApiUrl + url;
  };

  return (
    <List searchBarPlaceholder="Search common Grafana pages...">
      {sortedPages.map((page) => (
        <List.Item
          key={page.id}
          title={page.title}
          subtitle={page.subtitle}
          icon={page.icon}
          keywords={page.keywords}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={getFullUrl(page.url)} onOpen={() => visitItem(page)} />
              <Action.CopyToClipboard title="Copy URL" content={getFullUrl(page.url)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
