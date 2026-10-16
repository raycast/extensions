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

export default function Command(props: LaunchProps<{ launchContext: LaunchContext }>) {
  const { sites, site, setSiteId, isLoading: sitesLoading, reloadSites } = useSelectedSite();
  const [formId, setFormId] = useCachedState<string>("submissions:form", ALL);
  const [showingDetail, setShowingDetail] = useCachedState("submissions:detail", true);
  // Submissions newer than what was seen when the command opened get a "new" dot.
  const [seenBefore, setSeenBefore] = useState<number | undefined>(undefined);
  const launched = useRef(false);

  useEffect(() => {
    if (launched.current || !props.launchContext) return;
    launched.current = true;
    if (props.launchContext.siteId) setSiteId(props.launchContext.siteId);
    if (props.launchContext.formId !== undefined) setFormId(props.launchContext.formId);
  }, [props.launchContext]);

  const forms = useCachedPromise(getForms, [site as Site], { execute: Boolean(site) });

  // usePromise, not useCachedPromise: submissions hold people's names, emails and messages, and
  // Raycast's cache is stored unencrypted on disk.
  const submissions = usePromise(
    (current: Site, form: string) => async (options: { page: number }) => {
      const result = await getSubmissions(current, { formId: form, page: options.page + 1, perPage: PER_PAGE });
      return { data: result.submissions, hasMore: (options.page + 1) * PER_PAGE < result.total };
    },
    [site as Site, formId],
    { execute: Boolean(site) },
  );

  // Remember what was new on opening, then mark everything up to the newest as seen.
  useEffect(() => {
    if (!site || !forms.data) return;
    getSeen(site.id).then((seen) => {
      setSeenBefore(seen ?? forms.data!.max_id);
      setSeen(site.id, forms.data!.max_id);
    });
  }, [site?.id, forms.data?.max_id]);

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

  async function remove(items: Submission[]) {
    if (!site) return;
    const confirmed = await confirmAlert({
      title: items.length === 1 ? "Delete this submission?" : `Delete ${items.length} submissions?`,
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

  const items = submissions.data ?? [];
  const error = forms.error ?? submissions.error;
  const noTable = forms.data && !forms.data.table_exists;

  return (
    <List
      isLoading={sitesLoading || forms.isLoading || submissions.isLoading}
      isShowingDetail={showingDetail && items.length > 0}
      pagination={submissions.pagination}
      searchBarPlaceholder={site ? `Search submissions on ${site.name}…` : "Search submissions…"}
      searchBarAccessory={
        <List.Dropdown tooltip="Form" value={formId} onChange={setFormId}>
          <List.Dropdown.Item title={`All Forms${forms.data ? ` (${forms.data.total})` : ""}`} value={ALL} />
          {(forms.data?.forms ?? []).map((form) => (
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
