import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ErrorEmptyView, NoSitesView } from "./components/site-empty-view";
import { ManageSitesAction, SwitchSiteSubmenu, useSelectedSite } from "./hooks/use-selected-site";
import {
  Breakpoint,
  ClassDetail,
  getClassDetail,
  getDesign,
  getSiteInfo,
  GlobalClass,
  parseSettingKey,
  propertyLabel,
} from "./lib/design";
import { Site } from "./lib/sites";

const ALL = "__all";
const UNUSED = "__unused";
const UTILITY = "__utility";
const LOCKED = "__locked";
const EMPTY = "__empty";

function isEmpty(cls: GlobalClass): boolean {
  return cls.settings.length === 0 && !cls.css && !cls.is_utility;
}

function matchesFilter(cls: GlobalClass, filter: string): boolean {
  switch (filter) {
    case ALL:
      return true;
    case UNUSED:
      return cls.used_on === 0 && (cls.components ?? []).length === 0;
    case UTILITY:
      return Boolean(cls.is_utility);
    case LOCKED:
      return Boolean(cls.locked);
    case EMPTY:
      return isEmpty(cls);
    default:
      return (cls.category ?? "Uncategorized") === filter;
  }
}

/** Settings grouped by property, each with the breakpoints and states it is set for. */
function settingsBreakdown(cls: GlobalClass, breakpoints: Breakpoint[]) {
  const keys = new Set(breakpoints.map((b) => b.key));
  const labels = new Map(breakpoints.map((b) => [b.key, b.label]));
  const groups = new Map<string, Set<string>>();
  for (const key of cls.settings) {
    const parsed = parseSettingKey(key, keys);
    const where = [parsed.breakpoint ? (labels.get(parsed.breakpoint) ?? parsed.breakpoint) : null, parsed.state]
      .filter(Boolean)
      .join(" ");
    const set = groups.get(parsed.property) ?? new Set<string>();
    set.add(where || "Base");
    groups.set(parsed.property, set);
  }
  return [...groups].map(([property, where]) => ({ property, where: [...where] }));
}

function breakpointsUsed(cls: GlobalClass, breakpoints: Breakpoint[]): Breakpoint[] {
  const used = new Set(cls.settings.map((key) => key.split(":")[1]).filter(Boolean));
  return breakpoints.filter((b) => used.has(b.key));
}

function classMarkdown(cls: GlobalClass, detail: ClassDetail | undefined, loading: boolean): string {
  const parts = [`## .${cls.name}`];
  if (detail?.generated_css) {
    parts.push("**Generated CSS**\n\n```css\n" + detail.generated_css.trim() + "\n```");
  } else if (cls.css) {
    parts.push("**Custom CSS**\n\n```css\n" + cls.css.trim() + "\n```");
  }
  if (!detail && loading) parts.push("_Loading generated CSS…_");
  if (detail && !detail.generated_css && !cls.css) parts.push("_This class has no styles yet._");
  if ((cls.selectors ?? []).length > 0) {
    parts.push("**Extra selectors:** " + (cls.selectors ?? []).map((s) => `\`${s}\``).join(", "));
  }
  return parts.join("\n\n");
}

function ClassMetadata(props: { cls: GlobalClass; detail?: ClassDetail; breakpoints: Breakpoint[] }) {
  const { cls, detail, breakpoints } = props;
  const breakdown = settingsBreakdown(cls, breakpoints);
  const usedBreakpoints = breakpointsUsed(cls, breakpoints);
  const states = [...new Set(breakdown.flatMap((g) => g.where.map((w) => w.match(/(:[\w-]+.*)$/)?.[1])))].filter(
    (s): s is string => Boolean(s),
  );

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Category" text={cls.category ?? "Uncategorized"} />
      <List.Item.Detail.Metadata.Label
        title="Used On"
        text={
          cls.used_on === undefined
            ? "Unknown"
            : `${cls.used_on} ${cls.used_on === 1 ? "page" : "pages"}` +
              ((cls.components ?? []).length > 0 ? ` · ${(cls.components ?? []).length} components` : "")
        }
        icon={cls.used_on === 0 && (cls.components ?? []).length === 0 ? Icon.ExclamationMark : undefined}
      />
      {detail && detail.elements.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="On Elements">
          {detail.elements.map((element) => (
            <List.Item.Detail.Metadata.TagList.Item key={element} text={element} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {(cls.components ?? []).length > 0 && (
        <List.Item.Detail.Metadata.TagList title="In Components">
          {(cls.components ?? []).map((name) => (
            <List.Item.Detail.Metadata.TagList.Item key={name} text={name} color={Color.Purple} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {usedBreakpoints.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="Breakpoints">
          {usedBreakpoints.map((b) => (
            <List.Item.Detail.Metadata.TagList.Item key={b.key} text={`${b.label} ${b.width}px`} color={Color.Blue} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {states.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="States">
          {states.map((s) => (
            <List.Item.Detail.Metadata.TagList.Item key={s} text={s} color={Color.Orange} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {(cls.is_utility || cls.locked) && (
        <List.Item.Detail.Metadata.TagList title="Flags">
          {cls.is_utility ? <List.Item.Detail.Metadata.TagList.Item text="Utility" color={Color.Green} /> : null}
          {cls.locked ? <List.Item.Detail.Metadata.TagList.Item text="Locked" color={Color.Red} /> : null}
        </List.Item.Detail.Metadata.TagList>
      )}
      {breakdown.length > 0 && <List.Item.Detail.Metadata.Separator />}
      {breakdown.map((group) => (
        <List.Item.Detail.Metadata.Label
          key={group.property}
          title={propertyLabel(group.property)}
          text={group.where.join(", ")}
        />
      ))}
      {cls.modified ? (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Modified"
            text={new Date(cls.modified * 1000).toLocaleString() + (cls.modified_by ? ` by ${cls.modified_by}` : "")}
          />
        </>
      ) : null}
    </List.Item.Detail.Metadata>
  );
}

function UsedOnList(props: { site: Site; cls: GlobalClass }) {
  const { data, isLoading, error } = useCachedPromise(getClassDetail, [props.site, props.cls.id]);
  const posts = data?.used_on ?? [];
  return (
    <List isLoading={isLoading} navigationTitle={`.${props.cls.name} Used On`}>
      <ErrorEmptyView error={error} />
      <List.EmptyView icon={Icon.MagnifyingGlass} title={isLoading ? "Loading…" : "Not used on any page"} />
      <List.Section title="Pages and Templates" subtitle={`${posts.length}`}>
        {posts.map((post) => (
          <List.Item
            key={post.id}
            icon={Icon.Document}
            title={post.title || "(no title)"}
            accessories={[...(post.status !== "publish" ? [{ tag: post.status }] : []), { tag: post.type_label }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Bricks" url={post.builder_url} />
                <Action.OpenInBrowser
                  title="Open Live Page"
                  url={post.link}
                  shortcut={Keyboard.Shortcut.Common.OpenWith}
                />
                <Action.CopyToClipboard title="Copy Link" content={post.link} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {(data?.components ?? []).length > 0 && (
        <List.Section title="Components">
          {(data?.components ?? []).map((name) => (
            <List.Item key={name} icon={Icon.Box} title={name} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command() {
  const { sites, site, setSiteId, isLoading: sitesLoading, reloadSites } = useSelectedSite();
  const [filter, setFilter] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showingDetail, setShowingDetail] = useCachedState("classes:detail", true);

  const { data, isLoading, error, revalidate } = useCachedPromise(getDesign, [site as Site], {
    execute: Boolean(site),
    keepPreviousData: true,
  });
  // Breakpoints are only used for labels, so a failure here is not worth an error view.
  const { data: siteInfo } = useCachedPromise(getSiteInfo, [site as Site], {
    execute: Boolean(site),
    onError: () => undefined,
  });
  const breakpoints = siteInfo?.breakpoints ?? [];

  // Generated CSS and usage are loaded for the selected class only.
  const { data: detail, isLoading: detailLoading } = useCachedPromise(
    getClassDetail,
    [site as Site, selectedId ?? ""],
    { execute: Boolean(site && selectedId && showingDetail), keepPreviousData: false, onError: () => undefined },
  );

  const classes = useMemo(() => data?.classes ?? [], [data]);
  const categories = [...new Set(classes.map((c) => c.category ?? "Uncategorized"))].sort();
  const visible = classes.filter((c) => matchesFilter(c, filter));
  const count = (f: string) => classes.filter((c) => matchesFilter(c, f)).length;

  if (!sitesLoading && sites.length === 0) {
    return (
      <NoSitesView
        onSaved={(saved) => {
          setSiteId(saved.id);
          reloadSites();
        }}
      />
    );
  }

  return (
    <List
      isLoading={sitesLoading || isLoading}
      isShowingDetail={showingDetail && visible.length > 0}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder={
        site ? `Search ${visible.length} global classes on ${site.name}…` : "Search global classes…"
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Classes" value={ALL} />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title={`Unused (${count(UNUSED)})`} value={UNUSED} icon={Icon.ExclamationMark} />
            <List.Dropdown.Item title={`Empty (${count(EMPTY)})`} value={EMPTY} icon={Icon.Circle} />
            <List.Dropdown.Item title={`Utility (${count(UTILITY)})`} value={UTILITY} icon={Icon.Swatch} />
            <List.Dropdown.Item title={`Locked (${count(LOCKED)})`} value={LOCKED} icon={Icon.Lock} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Categories">
            {categories.map((c) => (
              <List.Dropdown.Item key={c} title={c} value={c} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <ErrorEmptyView error={error} />
      {visible.map((cls) => {
        const isSelected = cls.id === selectedId;
        const classDetail = isSelected && detail?.id === cls.id ? detail : undefined;
        const unused = cls.used_on === 0 && (cls.components ?? []).length === 0;
        return (
          <List.Item
            key={cls.id || cls.name}
            id={cls.id}
            icon={cls.locked ? Icon.Lock : cls.is_utility ? Icon.Swatch : Icon.Tag}
            title={cls.name}
            keywords={[
              cls.category ?? "",
              ...cls.settings.map((key) => propertyLabel(key.split(":")[0].replace(/^_/, ""))),
            ]}
            accessories={
              showingDetail
                ? undefined
                : [
                    ...(cls.used_on !== undefined
                      ? [
                          {
                            text: unused ? "unused" : `${cls.used_on}`,
                            icon: unused ? undefined : Icon.Document,
                            tooltip: "Pages using this class",
                          },
                        ]
                      : []),
                    { tag: cls.category ?? "Uncategorized" },
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={classMarkdown(cls, classDetail, isSelected && detailLoading)}
                metadata={<ClassMetadata cls={cls} detail={classDetail} breakpoints={breakpoints} />}
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Class Name" content={cls.name} />
                  <Action.Paste title="Paste Class Name" content={cls.name} />
                  <Action.CopyToClipboard
                    title="Copy as Selector"
                    content={`.${cls.name}`}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  {classDetail?.generated_css && (
                    <Action.CopyToClipboard
                      title="Copy Generated CSS"
                      content={classDetail.generated_css}
                      shortcut={Keyboard.Shortcut.Common.CopyName}
                    />
                  )}
                  {cls.css && (
                    <Action.CopyToClipboard
                      title="Copy Custom CSS"
                      content={cls.css}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {site && (
                    <Action.Push
                      title="Show Pages Using Class"
                      icon={Icon.List}
                      shortcut={{ modifiers: ["cmd"], key: "u" }}
                      target={<UsedOnList site={site} cls={cls} />}
                    />
                  )}
                  <Action
                    title={showingDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setShowingDetail(!showingDetail)}
                  />
                  <Action
                    title="Reload"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <SwitchSiteSubmenu sites={sites} current={site} onChange={setSiteId} />
                  <ManageSitesAction onPop={reloadSites} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
