import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { buildPostJobUrl } from "./jobs-feed";
import {
  DISCORD_URL,
  GITHUB_DISCUSSIONS_URL,
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
  HEYCLAUDE_URL,
  RAYCAST_STORE_URL,
  X_URL,
  withRaycastUtm,
} from "./links";

type LinkItem = {
  id: string;
  section: string;
  title: string;
  subtitle: string;
  url: string;
  icon: Icon;
  quicklinkName?: string;
};

const items: LinkItem[] = [
  {
    id: "newsletter",
    section: "Stay Updated",
    title: "Subscribe to Newsletter",
    subtitle: "Occasional launch notes and curated AI workflow drops.",
    url: `${HEYCLAUDE_URL}/?newsletter=1`,
    icon: Icon.Envelope,
    quicklinkName: "HeyClaude Newsletter",
  },
  {
    id: "github",
    section: "Support the Project",
    title: "Star or Fork on GitHub",
    subtitle: "Help more Claude and AI builders discover the registry.",
    url: GITHUB_REPO_URL,
    icon: Icon.Star,
    quicklinkName: "HeyClaude GitHub",
  },
  {
    id: "raycast",
    section: "Support the Project",
    title: "Open Raycast Listing",
    subtitle: "Review, share, or install the Raycast extension.",
    url: RAYCAST_STORE_URL,
    icon: Icon.AppWindow,
    quicklinkName: "HeyClaude Raycast",
  },
  {
    id: "submit",
    section: "Contribute",
    title: "Submit New Content",
    subtitle: "Open the reviewed contribution path for registry entries.",
    url: `${HEYCLAUDE_URL}/submit`,
    icon: Icon.Plus,
    quicklinkName: "Submit to HeyClaude",
  },
  {
    id: "claim",
    section: "Contribute",
    title: "Claim or Update a Listing",
    subtitle: "Request ownership, corrections, or richer listing metadata.",
    url: `${HEYCLAUDE_URL}/claim`,
    icon: Icon.Pencil,
    quicklinkName: "Claim HeyClaude Listing",
  },
  {
    id: "submissions",
    section: "Contribute",
    title: "Browse Open Submissions",
    subtitle: "Review the public submission queue and validation status.",
    url: `${HEYCLAUDE_URL}/submissions`,
    icon: Icon.MagnifyingGlass,
    quicklinkName: "HeyClaude Submissions",
  },
  {
    id: "jobs",
    section: "Jobs",
    title: "Post a Job",
    subtitle: "Submit an AI, Claude, MCP, or agent role for review.",
    url: buildPostJobUrl(),
    icon: Icon.Document,
    quicklinkName: "Post a HeyClaude Job",
  },
  {
    id: "api",
    section: "Developers",
    title: "Open API Docs",
    subtitle: "Use registry APIs, feeds, llms.txt, MCP, and static artifacts.",
    url: `${HEYCLAUDE_URL}/api-docs`,
    icon: Icon.Code,
    quicklinkName: "HeyClaude API Docs",
  },
  {
    id: "feeds",
    section: "Developers",
    title: "Open Feed Index",
    subtitle: "Browse machine-readable category, platform, and registry feeds.",
    url: `${HEYCLAUDE_URL}/data/feeds/index.json`,
    icon: Icon.Rss,
    quicklinkName: "HeyClaude Feeds",
  },
  {
    id: "issues",
    section: "Community",
    title: "Open GitHub Issues",
    subtitle: "Report bugs, content gaps, and contribution ideas.",
    url: GITHUB_ISSUES_URL,
    icon: Icon.ExclamationMark,
    quicklinkName: "HeyClaude Issues",
  },
  {
    id: "discussions",
    section: "Community",
    title: "Open GitHub Discussions",
    subtitle: "Discuss registry ideas and community improvements.",
    url: GITHUB_DISCUSSIONS_URL,
    icon: Icon.SpeechBubble,
    quicklinkName: "HeyClaude Discussions",
  },
  {
    id: "discord",
    section: "Community",
    title: "Join Discord",
    subtitle: "Follow along and discuss Claude workflow tooling.",
    url: DISCORD_URL,
    icon: Icon.TwoPeople,
    quicklinkName: "HeyClaude Discord",
  },
  {
    id: "creator",
    section: "Creator",
    title: "Follow JSONbored",
    subtitle: "Follow the creator for project updates.",
    url: X_URL,
    icon: Icon.Person,
    quicklinkName: "JSONbored",
  },
];

export default function Command() {
  const sections = [...new Set(items.map((item) => item.section))];

  return (
    <List searchBarPlaceholder="Search HeyClaude links, contribution paths, and support options...">
      {sections.map((section) => (
        <List.Section key={section} title={section}>
          {items
            .filter((item) => item.section === section)
            .map((item) => {
              const url = withRaycastUtm(item.url, item.id);
              return (
                <List.Item
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Open"
                        url={url}
                        icon={item.icon}
                      />
                      <Action.CopyToClipboard
                        title="Copy URL"
                        content={item.url}
                      />
                      <Action.CreateQuicklink
                        title="Create Quicklink"
                        quicklink={{
                          name: item.quicklinkName || item.title,
                          link: url,
                          icon: item.icon,
                        }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      ))}
    </List>
  );
}
