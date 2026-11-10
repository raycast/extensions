import { failToast, onErrorToast } from "@chrismessina/raycast-kit";
import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchJobs } from "../lib/api";
import { day } from "../lib/format";
import type { Content, MetaItem } from "../lib/meta";
import type { Job } from "../lib/types";
import { ErrorEmptyView } from "./error-view";
import { useDetailPane } from "./view-actions";

function jobContent(j: Job, teamColor?: Color): Content {
  const md = [`# ${j.title}`];
  if (j.description)
    md.push(j.description + (j.descriptionTruncated ? "\n\n*…truncated — open the job for the full text.*" : ""));
  const meta: MetaItem[] = [];
  if (j.team) meta.push({ kind: "tags", title: "Team", tags: [j.team], color: teamColor });
  if (j.location)
    meta.push({ kind: "label", title: "Location", text: j.remote ? `${j.location} · Remote` : j.location });
  if (j.compensation) meta.push({ kind: "label", title: "Compensation", text: j.compensation });
  if (j.roleType) meta.push({ kind: "label", title: "Function", text: j.roleType });
  const posted = day(j.postedAt);
  if (posted) meta.push({ kind: "label", title: "Posted", text: posted });
  return { markdown: md.join("\n\n"), meta };
}

const TEAM_COLORS = [Color.Blue, Color.Orange, Color.Green, Color.Magenta, Color.Yellow, Color.Red, Color.Purple];

/**
 * Colors go to teams in the order they first appear among the loaded roles, so the first seven teams never share a
 * color and Load More (which only appends roles) never recolors a team already on screen.
 */
function teamColors(jobs: Job[]): Map<string, Color> {
  const colors = new Map<string, Color>();
  for (const j of jobs)
    if (j.team && !colors.has(j.team)) colors.set(j.team, TEAM_COLORS[colors.size % TEAM_COLORS.length]);
  return colors;
}

const ALL_TEAMS = "__all__";
const NO_TEAM = "__none__";

/** Cosign's job search has no company-id filter; it resolves the employer from its name. */
export function JobsView({ name }: { name: string }) {
  const [team, setTeam] = useState(ALL_TEAMS);
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchJobs, [name], {
    onError: onErrorToast({ title: "Couldn't load open roles" }),
  });
  const { showDetail, viewSection, metadata } = useDetailPane("show-detail-jobs");
  // Pages after the first. Explicit only: each one spends a call from Cosign's semantic search budget.
  const [more, setMore] = useState<{ jobs: Job[]; nextCursor: string | null } | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const jobs = data ? [...data.jobs, ...(more?.jobs ?? [])] : [];
  const nextCursor = more ? more.nextCursor : (data?.nextCursor ?? null);
  const colors = teamColors(jobs);
  const teams = [...colors.keys()].sort((a, b) => a.localeCompare(b));
  const shown = jobs.filter((j) => (team === ALL_TEAMS ? true : team === NO_TEAM ? !j.team : j.team === team));
  // One section per team, so the team needs no accessory (a tag is too wide beside the sidebar). Roles with no team last.
  const sections: [string, Job[]][] = [
    ...teams.map((t): [string, Job[]] => [t, shown.filter((j) => j.team === t)]),
    ["No Team", shown.filter((j) => !j.team)],
  ].filter(([, roles]) => roles.length > 0) as [string, Job[]][];

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Loading more roles…" });
    try {
      const page = await fetchJobs(name, nextCursor);
      setMore({ jobs: [...(more?.jobs ?? []), ...page.jobs], nextCursor: page.nextCursor });
      toast.style = Toast.Style.Success;
      toast.title = `Loaded ${page.jobs.length} more ${page.jobs.length === 1 ? "role" : "roles"}`;
    } catch (error) {
      failToast(toast, error, { title: "Couldn't load more roles" });
    } finally {
      setIsLoadingMore(false);
    }
  }

  const loadMoreAction = nextCursor ? (
    <Action title="Load More Roles" icon={Icon.ArrowDownCircle} onAction={loadMore} />
  ) : null;

  return (
    <List
      isLoading={isLoading || isLoadingMore}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter open roles"
      navigationTitle={
        data
          ? `${name} — Open Roles${data.totalMatches != null ? ` (${data.totalMatches})` : ""} — showing ${jobs.length}`
          : name
      }
      searchBarAccessory={
        teams.length ? (
          <List.Dropdown tooltip="Filter by Team" value={team} onChange={setTeam}>
            <List.Dropdown.Item title="All Teams" value={ALL_TEAMS} />
            <List.Dropdown.Section>
              {teams.map((t) => (
                <List.Dropdown.Item
                  key={t}
                  title={t}
                  value={t}
                  icon={{ source: Icon.CircleFilled, tintColor: colors.get(t) }}
                />
              ))}
            </List.Dropdown.Section>
            {jobs.some((j) => !j.team) ? <List.Dropdown.Item title="No Team" value={NO_TEAM} /> : null}
          </List.Dropdown>
        ) : undefined
      }
    >
      {sections.map(([title, roles]) => (
        <List.Section key={title} title={title}>
          {roles.map((j) => {
            const content = jobContent(j, j.team ? colors.get(j.team) : undefined);
            return (
              <List.Item
                key={j.postingId}
                title={j.title}
                detail={<List.Item.Detail markdown={content.markdown} metadata={metadata(content.meta)} />}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open Job on Cosign" url={j.url} />
                    {j.applyUrl ? <Action.OpenInBrowser title="Apply" url={j.applyUrl} /> : null}
                    <Action.CopyToClipboard title="Copy Job URL" content={j.url} />
                    {loadMoreAction}
                    {viewSection}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      {nextCursor ? (
        <List.Item
          key="load-more"
          title="Load More Roles"
          icon={Icon.ArrowDownCircle}
          actions={
            <ActionPanel>
              {loadMoreAction}
              {viewSection}
            </ActionPanel>
          }
        />
      ) : null}
      {error && !data ? <ErrorEmptyView title="Couldn't load open roles" error={error} retry={revalidate} /> : null}
      {data && !data.jobs.length ? <List.EmptyView title="No open roles" /> : null}
      {data && data.jobs.length > 0 && !shown.length && !nextCursor ? (
        <List.EmptyView title="No roles on this team" description="Choose All Teams to see every role." />
      ) : null}
    </List>
  );
}
