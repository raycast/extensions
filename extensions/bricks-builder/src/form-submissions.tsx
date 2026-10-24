import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { ErrorEmptyView, NoSitesView } from "./components/site-empty-view";
import { ManageSitesAction, SwitchSiteSubmenu, useSelectedSite } from "./hooks/use-selected-site";
import { deleteSubmissions, getForms, getSubmissions, Submission, submissionTitle } from "./lib/bricks-data";
import { escapeMarkdown } from "./lib/markdown";
import { Site, wpAdminUrl } from "./lib/sites";
import { getSeen, setSeen } from "./lib/submissions-seen";

const ALL = "";
const PER_PAGE = 50;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Opened from the menu bar with the site (and form) to show. */
interface LaunchContext {
  siteId?: string;
  formId?: string;
}

/** Forms tagged with the site they came from, so another site's cached list is never used. */
async function getSiteForms(site: Site) {
  return { ...(await getForms(site)), siteId: site.id };
}

export default function Command(props: LaunchProps<{ launchContext: LaunchContext }>) {
  const { sites, site, setSiteId, isLoading: sitesLoading, reloadSites } = useSelectedSite();
  const [savedFormId, setFormId] = useCachedState<string>("submissions:form", ALL);
  const [showingDetail, setShowingDetail] = useCachedState("submissions:detail", true);
  // Submissions newer than what was seen when the command opened get a "new" dot. Kept per site, so
  // a site switch doesn't use the previous site's value.
  const [seen, setSeenState] = useState<{ siteId: string; before: number }>();
  const seenBefore = seen && seen.siteId === site?.id ? seen.before : undefined;
  const launched = useRef(false);
  const previousSiteId = useRef<string | undefined>(undefined);
  // From the menu bar, wait until its site is selected before loading or marking anything as seen.
  const launchSiteId = props.launchContext?.siteId;
  const [launchApplied, setLaunchApplied] = useState(!launchSiteId);
  useEffect(() => {
    if (launchApplied || !site) return;
    if (site.id === launchSiteId || !sites.some((s) => s.id === launchSiteId)) setLaunchApplied(true);
  }, [launchApplied, site?.id, sites]);
  const ready = Boolean(site) && launchApplied;

  useEffect(() => {
    if (launched.current || !props.launchContext) return;
    launched.current = true;
    if (props.launchContext.siteId) setSiteId(props.launchContext.siteId);
    if (props.launchContext.formId !== undefined) setFormId(props.launchContext.formId);
  }, [props.launchContext]);

  // Form IDs belong to one site: switching sites goes back to all forms (a menu-bar launch picks
  // its site and form together, so it isn't a switch).
  useEffect(() => {
    if (!site || !launchApplied) return;
    const switched = previousSiteId.current !== undefined && previousSiteId.current !== site.id;
    previousSiteId.current = site.id;
    if (switched) setFormId(ALL);
  }, [site?.id, launchApplied]);

  const forms = useCachedPromise(getSiteForms, [site as Site], { execute: ready });
  const formsData = ready && forms.data?.siteId === site?.id ? forms.data : undefined;
  // A saved form that isn't on this site would leave the list empty.
  const formId =
    savedFormId !== ALL && formsData && !formsData.forms.some((form) => form.form_id === savedFormId)
      ? ALL
      : savedFormId;

  // usePromise, not useCachedPromise: submissions hold people's names, emails and messages, and
  // Raycast's cache is stored unencrypted on disk.
  const submissions = usePromise(
    (current: Site, form: string) => async (options: { page: number }) => {
      const result = await getSubmissions(current, { formId: form, page: options.page + 1, perPage: PER_PAGE });
      // Tagged with the site they came from, so a site switch never shows (or deletes) them on another.
      const data = result.submissions.map((submission) => ({ ...submission, siteId: current.id }));
      return { data, hasMore: (options.page + 1) * PER_PAGE < result.total };
    },
    [site as Site, formId],
    { execute: ready },
  );

  // Remember what was new on opening, then mark everything up to the newest as seen.
  useEffect(() => {
    if (!site || !formsData) return;
    const siteId = site.id;
    const maxId = formsData.max_id;
    let cancelled = false;
    getSeen(siteId).then((stored) => {
      if (cancelled) return;
      setSeenState({ siteId, before: stored ?? maxId });
      setSeen(siteId, maxId);
    });
    return () => {
      cancelled = true;
    };
  }, [site?.id, formsData?.max_id]);

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

  const reload = () => {
    forms.revalidate();
    submissions.revalidate();
  };

  async function remove(items: (Submission & { siteId: string })[]) {
    if (!site || items.some((item) => item.siteId !== site.id)) return;
    const confirmed = await confirmAlert({
      title:
        items.length === 1
          ? `Delete this submission from ${site.name}?`
          : `Delete ${items.length} submissions from ${site.name}?`,
      message: "They're removed from the site's database. This can't be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting…" });
    try {
      const result = await deleteSubmissions(
        site,
        items.map((s) => s.id),
      );
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${result.deleted} ${result.deleted === 1 ? "submission" : "submissions"}`;
      reload();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't delete";
      toast.message = errorMessage(error);
    }
  }

  const siteActions = (
    <ActionPanel.Section>
      <Action
        title={showingDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => setShowingDetail(!showingDetail)}
      />
      <Action title="Reload" icon={Icon.ArrowClockwise} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={reload} />
      {site && (
        <Action.OpenInBrowser
          title="Open Submissions in WordPress"
          icon={Icon.Globe}
          url={`${wpAdminUrl(site, "admin.php")}?page=bricks-form-submissions${formId ? `&form_id=${encodeURIComponent(formId)}` : ""}`}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      )}
      <SwitchSiteSubmenu sites={sites} current={site} onChange={setSiteId} />
      <ManageSitesAction onPop={reloadSites} />
    </ActionPanel.Section>
  );

  const items = (submissions.data ?? []).filter((submission) => submission.siteId === site?.id);
  const error = forms.error ?? submissions.error;
  const noTable = formsData && !formsData.table_exists;

  return (
    <List
      isLoading={sitesLoading || forms.isLoading || submissions.isLoading}
      isShowingDetail={showingDetail && items.length > 0}
      pagination={submissions.pagination}
      searchBarPlaceholder={site ? `Search submissions on ${site.name}…` : "Search submissions…"}
      searchBarAccessory={
        <List.Dropdown tooltip="Form" value={formId} onChange={setFormId}>
          <List.Dropdown.Item title={`All Forms${formsData ? ` (${formsData.total})` : ""}`} value={ALL} />
          {(formsData?.forms ?? []).map((form) => (
            <List.Dropdown.Item key={form.form_id} title={`${form.name} (${form.count})`} value={form.form_id} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <ErrorEmptyView error={error} actions={siteActions} onRetry={reload} />
      ) : (
        <List.EmptyView
          icon={Icon.Envelope}
          title={noTable ? "No submissions saved on this site" : "No submissions"}
          description={
            noTable
              ? 'Bricks saves submissions when a Form element has the "Save submission" action.'
              : "New submissions show up here and in the menu bar."
          }
          actions={<ActionPanel>{siteActions}</ActionPanel>}
        />
      )}
      {site &&
        items.map((submission) => {
          const isNew = seenBefore !== undefined && submission.id > seenBefore;
          const created = new Date(submission.created_at);
          return (
            <List.Item
              key={submission.id}
              icon={isNew ? { source: Icon.CircleFilled, tintColor: Color.Blue } : Icon.Envelope}
              title={submissionTitle(submission)}
              subtitle={showingDetail ? undefined : submission.form_name}
              keywords={[submission.form_name, ...submission.fields.map((f) => f.value)]}
              accessories={[{ date: created, tooltip: created.toLocaleString() }]}
              detail={
                <List.Item.Detail
                  markdown={submission.fields
                    .filter((f) => f.value)
                    .map((f) => `**${escapeMarkdown(f.label)}**\n\n${escapeMarkdown(f.value).replace(/\n/g, "  \n")}`)
                    .join("\n\n")}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Form" text={submission.form_name} />
                      {submission.post && (
                        <List.Item.Detail.Metadata.Link
                          title="Page"
                          text={submission.post.title || "(no title)"}
                          target={submission.post.link}
                        />
                      )}
                      <List.Item.Detail.Metadata.Label title="Submitted" text={created.toLocaleString()} />
                      {submission.user && <List.Item.Detail.Metadata.Label title="User" text={submission.user} />}
                      {(submission.browser || submission.os) && (
                        <List.Item.Detail.Metadata.Label
                          title="Browser"
                          text={[submission.browser, submission.os].filter(Boolean).join(" · ")}
                        />
                      )}
                      {submission.ip && <List.Item.Detail.Metadata.Label title="IP" text={submission.ip} />}
                      {submission.referrer && (
                        <List.Item.Detail.Metadata.Label title="Referrer" text={submission.referrer} />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {submission.email && (
                    <Action.OpenInBrowser
                      title="Reply by Email"
                      icon={Icon.Envelope}
                      url={`mailto:${submission.email}?subject=${encodeURIComponent(`Re: ${submission.form_name}`)}`}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Submission"
                    content={submission.fields.map((f) => `${f.label}: ${f.value}`).join("\n")}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  {submission.email && (
                    <Action.CopyToClipboard
                      title="Copy Email"
                      content={submission.email}
                      shortcut={Keyboard.Shortcut.Common.CopyName}
                    />
                  )}
                  <ActionPanel.Submenu
                    title="Copy Field…"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  >
                    {submission.fields
                      .filter((f) => f.value)
                      .map((f) => (
                        <Action.CopyToClipboard key={f.id} title={f.label} content={f.value} />
                      ))}
                  </ActionPanel.Submenu>
                  {submission.post && (
                    <Action.OpenInBrowser
                      title="Open Form in Bricks"
                      icon={Icon.Hammer}
                      url={submission.post.builder_url}
                      shortcut={Keyboard.Shortcut.Common.OpenWith}
                    />
                  )}
                  <Action
                    title="Delete Submission"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove([submission])}
                  />
                  {siteActions}
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
