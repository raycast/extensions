import { useState } from "react";
import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { fetchTemplates, fetchTemplateDetail, templatePageUrl, templateDeployUrl, TemplateGQL } from "./railway";

type VerifiedFilter = "all" | "verified";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<VerifiedFilter>("all");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const {
    isLoading,
    data: templates = [],
    pagination,
  } = useCachedPromise(
    (query: string) => async (options: { page: number; cursor?: string }) => {
      const result = await fetchTemplates(query, options.cursor);
      return {
        data: result.templates,
        hasMore: result.hasNextPage,
        cursor: result.endCursor ?? undefined,
      };
    },
    [searchText],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Failed to load templates" });
      },
    },
  );

  const { data: readme } = useCachedPromise(
    async (code: string | null, showDetail: boolean) => (code && showDetail ? fetchTemplateDetail(code) : null),
    [selectedCode, isShowingDetail],
    {
      keepPreviousData: false,
      onError: (error) => {
        showFailureToast(error, { title: "Failed to load template details" });
      },
    },
  );

  const filtered = filter === "verified" ? templates.filter((t) => t.isVerified) : templates;
  const seen = new Set<string>();
  const visible = filtered.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
  const sectionTitle = searchText ? "Results" : "Popular Templates";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && visible.length > 0}
      searchBarPlaceholder="Search Railway templates"
      onSearchTextChange={setSearchText}
      pagination={pagination}
      onSelectionChange={(id) => {
        const t = templates.find((tpl) => tpl.id === id);
        setSelectedCode(t?.code ?? null);
      }}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter templates" value={filter} onChange={(v) => setFilter(v as VerifiedFilter)}>
          <List.Dropdown.Item title="All Templates" value="all" icon={Icon.AppWindowGrid3x3} />
          <List.Dropdown.Item
            title="Verified Only"
            value="verified"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Blue }}
          />
        </List.Dropdown>
      }
    >
      {!isLoading && visible.length === 0 && (
        <List.EmptyView
          title="No templates found"
          description={filter === "verified" ? "Try switching to All Templates" : "Try a different search term"}
          icon={Icon.MagnifyingGlass}
        />
      )}
      <List.Section title={sectionTitle}>
        {visible.map((t) => (
          <List.Item
            key={t.id}
            id={t.id}
            icon={t.image ? { source: t.image, fallback: Icon.Box } : Icon.Box}
            title={t.name}
            subtitle={isShowingDetail ? undefined : t.creatorName}
            keywords={[t.creatorName, t.description].filter((s): s is string => Boolean(s))}
            accessories={isShowingDetail ? undefined : buildAccessories(t)}
            detail={
              <List.Item.Detail
                markdown={buildMarkdown(t, t.code === selectedCode ? readme : undefined)}
                metadata={buildMetadata(t)}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Deploy on Railway" url={templateDeployUrl(t.code)} />
                <Action.OpenInBrowser
                  title="View Template"
                  url={templatePageUrl(t.code)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action
                  title={isShowingDetail ? "Hide Details" : "Show Details"}
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setIsShowingDetail((v) => !v)}
                />
                <Action.CopyToClipboard
                  title="Copy Template URL"
                  content={templatePageUrl(t.code)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Deploy URL"
                  content={templateDeployUrl(t.code)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function buildMarkdown(t: TemplateGQL, readme: string | null | undefined): string {
  if (readme) return readme;
  const parts: string[] = [`# ${t.name}`];
  if (t.image) parts.push(`![${t.name}](${t.image})`);
  if (t.description) parts.push(t.description);
  return parts.join("\n\n");
}

function buildMetadata(t: TemplateGQL) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Creator" text={t.creatorName} />
      <List.Item.Detail.Metadata.Label
        title="Verified"
        icon={
          t.isVerified
            ? { source: Icon.CheckCircle, tintColor: Color.Blue }
            : { source: Icon.Circle, tintColor: Color.SecondaryText }
        }
        text={t.isVerified ? "Yes" : "No"}
      />
      {t.healthScore != null ? (
        <List.Item.Detail.Metadata.TagList title="Health Score">
          <List.Item.Detail.Metadata.TagList.Item text={`${t.healthScore}`} color={healthColor(t.healthScore)} />
        </List.Item.Detail.Metadata.TagList>
      ) : (
        <List.Item.Detail.Metadata.Label title="Health Score" text="No score" />
      )}
      <List.Item.Detail.Metadata.Label
        title="Deployments"
        text={t.deploymentCount.toLocaleString()}
        icon={Icon.Download}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Link title="Template Page" target={templatePageUrl(t.code)} text="Open" />
    </List.Item.Detail.Metadata>
  );
}

function buildAccessories(t: TemplateGQL): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (t.isVerified) {
    accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Blue }, tooltip: "Verified" });
  }

  if (t.healthScore != null) {
    accessories.push({
      tag: { value: `${t.healthScore}`, color: healthColor(t.healthScore) },
      tooltip: `Health score: ${t.healthScore}`,
    });
  }

  accessories.push({
    icon: Icon.Download,
    text: formatCount(t.deploymentCount),
    tooltip: `${t.deploymentCount.toLocaleString()} deployments`,
  });

  return accessories;
}

function healthColor(score: number): Color {
  if (score >= 90) return Color.Green;
  if (score >= 70) return Color.Yellow;
  return Color.Red;
}

function formatCount(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
