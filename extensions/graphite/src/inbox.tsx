import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import type { ReactNode } from "react";
import { ConfigureSections } from "./components/configure-sections";
import {
  OpenPullRequestActions,
  PullRequestActionPanel,
  RefreshAction,
  SHORTCUTS,
  ToggleDetailsAction,
} from "./components/pull-request-actions";
import { PullRequestView } from "./components/pull-request-view";
import { InboxErrorView } from "./components/setup-views";
import { StatusLookup, usePullRequestStatuses } from "./hooks/use-pull-request-statuses";
import { useSectionSettings } from "./hooks/use-section-settings";
import { fetchInbox, Inbox, InboxError, InboxSection, PullRequest } from "./lib/api";
import { PullRequestRef, PullRequestStatus, refKey } from "./lib/github";
import {
  checksIndicator,
  conversationsIndicator,
  Indicator,
  mergeIndicator,
  reviewIndicator,
  viewerReviewIndicator,
} from "./lib/indicators";
import {
  authorIcon,
  GRAPHITE_CLI_AUTH_URL,
  inboxErrorTitles,
  pluralize,
  pullRequestLinks,
  pullRequestStatusTag,
  relativeTime,
} from "./lib/presentation";

const ALL_SECTIONS = "all";
const GITHUB_CLI_URL = "https://cli.github.com";

const toRef = (pr: PullRequest): PullRequestRef => ({ owner: pr.repo.owner, repo: pr.repo.name, number: pr.number });

type Facts = {
  status: PullRequestStatus | undefined;
  mergeability: string | undefined;
};

function factsFor(pr: PullRequest, lookup: StatusLookup | undefined): Facts {
  const key = refKey(toRef(pr));
  return { status: lookup?.github[key], mergeability: lookup?.mergeability[key] };
}

/** Accessories for a row, honouring the "Show in List" preferences. Quiet facts (e.g. "review required") are skipped. */
function accessoriesFor(pr: PullRequest, facts: Facts): List.Item.Accessory[] {
  const prefs = getPreferenceValues<Preferences.Inbox>();
  const { status, mergeability } = facts;
  const accessories: List.Item.Accessory[] = [];
  const tag = (indicator: Indicator): List.Item.Accessory => ({
    tag: { value: indicator.label, color: indicator.color },
    tooltip: indicator.tooltip,
  });
  const icon = (indicator: Indicator, text?: string): List.Item.Accessory => ({
    icon: { source: indicator.icon, tintColor: indicator.color },
    text: text ? { value: text, color: indicator.color } : undefined,
    tooltip: indicator.tooltip ?? indicator.label,
  });

  if (pr.state !== "OPEN") {
    const state = pullRequestStatusTag(pr.state);
    accessories.push({ tag: { value: state.value, color: state.color } });
  } else if (status?.isDraft) {
    accessories.push({ tag: { value: "Draft", color: Color.SecondaryText } });
  }

  if (prefs.showMergeStatus) {
    const merge = mergeIndicator(mergeability);
    if (merge && merge.color !== Color.SecondaryText) accessories.push(tag(merge));
  }
  if (prefs.showReviewStatus) {
    const review = reviewIndicator(status?.reviewDecision ?? pr.reviewDecision);
    if (review && review.label !== "Review required") accessories.push(tag(review));
    const mine = status ? viewerReviewIndicator(status) : undefined;
    if (mine) accessories.push(icon(mine));
  }
  if (prefs.showComments && status) {
    const conversations = conversationsIndicator(status);
    if (conversations) {
      accessories.push(icon(conversations, status.unresolvedThreads ? String(status.unresolvedThreads) : undefined));
    }
  }
  if (prefs.showChecks && status) {
    const checks = checksIndicator(status.checks);
    if (checks) accessories.push(icon(checks));
  }
  if (prefs.showUpdated) {
    const updatedAt = new Date(pr.updatedAt);
    accessories.push({ date: updatedAt, tooltip: `Updated ${updatedAt.toLocaleString()}` });
  }
  return accessories;
}

function SidePanel(props: { pr: PullRequest; facts: Facts; sectionNames: string[] }) {
  const { pr, facts, sectionNames } = props;
  const { status, mergeability } = facts;
  const { defaultAction } = getPreferenceValues<Preferences.Inbox>();
  const state = pullRequestStatusTag(pr.state, status?.isDraft);
  const rows: [string, Indicator | undefined][] = [
    ["Merge", mergeIndicator(mergeability)],
    ["Review", reviewIndicator(status?.reviewDecision ?? pr.reviewDecision)],
    ["You", status ? viewerReviewIndicator(status) : undefined],
    ["Comments", status ? conversationsIndicator(status) : undefined],
    ["Checks", status ? checksIndicator(status.checks) : undefined],
  ];

  return (
    <List.Item.Detail
      markdown={`## ${pr.title}\n\n**${pr.repo.owner}/${pr.repo.name}** · #${pr.number}\n\nPress ${defaultAction === "browser" ? "⌘↵" : "↵"} for the description and comments.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={state.value} color={state.color} />
          </List.Item.Detail.Metadata.TagList>
          {rows.map(([title, indicator]) =>
            indicator ? (
              <List.Item.Detail.Metadata.Label
                key={title}
                title={title}
                text={indicator.label}
                icon={{ source: indicator.icon, tintColor: indicator.color }}
              />
            ) : null,
          )}
          <List.Item.Detail.Metadata.Separator />
          {pr.author ? (
            <List.Item.Detail.Metadata.Label title="Author" text={pr.author.login} icon={authorIcon(pr)} />
          ) : null}
          <List.Item.Detail.Metadata.Label title="Opened" text={relativeTime(pr.createdAt)} />
          <List.Item.Detail.Metadata.Label title="Updated" text={relativeTime(pr.updatedAt)} />
          <List.Item.Detail.Metadata.TagList title="In Your Inbox">
            {sectionNames.map((name) => (
              <List.Item.Detail.Metadata.TagList.Item key={name} text={name} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function PullRequestItem(props: {
  pr: PullRequest;
  inbox: Inbox;
  facts: Facts;
  sectionNames: string[];
  githubAvailable: boolean;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
  sharedActions: ReactNode;
}) {
  const { pr, inbox, facts, sectionNames, githubAvailable, isShowingDetail, onToggleDetail, onRefresh, sharedActions } =
    props;
  const { defaultAction } = getPreferenceValues<Preferences.Inbox>();
  const links = pullRequestLinks(inbox.appUrl, pr.repo.owner, pr.repo.name, pr.number);
  const showDetails = (
    <Action.Push
      title="Show Pull Request"
      icon={Icon.Document}
      target={
        <PullRequestView pullRequest={pr} appUrl={inbox.appUrl} sectionNames={sectionNames} onChanged={onRefresh} />
      }
    />
  );

  return (
    <List.Item
      icon={{ value: authorIcon(pr), tooltip: pr.author?.login ?? "Unknown author" }}
      title={pr.title}
      subtitle={
        isShowingDetail
          ? undefined
          : { value: `${pr.repo.name} #${pr.number}`, tooltip: `${pr.repo.owner}/${pr.repo.name}` }
      }
      keywords={[String(pr.number), pr.repo.name, pr.author?.login ?? "", pr.author?.name ?? ""]}
      accessories={isShowingDetail ? undefined : accessoriesFor(pr, facts)}
      detail={<SidePanel pr={pr} facts={facts} sectionNames={sectionNames} />}
      actions={
        <PullRequestActionPanel
          pullRequest={toRef(pr)}
          title={pr.title}
          links={links}
          githubAvailable={githubAvailable}
          status={facts.status}
          mergeability={facts.mergeability}
          onChanged={onRefresh}
          openActions={
            <>
              {defaultAction === "browser" ? <OpenPullRequestActions links={links} which="primary" /> : showDetails}
              {defaultAction === "browser" ? showDetails : <OpenPullRequestActions links={links} which="primary" />}
              <OpenPullRequestActions links={links} which="secondary" />
              <ToggleDetailsAction isShowingDetail={isShowingDetail} onToggle={onToggleDetail} />
            </>
          }
          extraActions={sharedActions}
        />
      }
    />
  );
}

export default function Command() {
  const {
    data: inbox,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(fetchInbox, [], {
    keepPreviousData: true,
    // The list renders its own error state; skip the generic failure toast.
    onError: () => undefined,
  });
  const sectionSettings = useSectionSettings();
  const [selectedSection, setSelectedSection] = useCachedState<string>("inbox-section", ALL_SECTIONS);
  const [isShowingDetail, setShowingDetail] = useCachedState<boolean>("inbox-show-detail", false);
  const [hideGitHubHint, setHideGitHubHint] = useCachedState<boolean>("hide-github-cli-hint", false);
  const [hideAccessHint, setHideAccessHint] = useCachedState<boolean>("hide-github-access-hint", false);

  const sections = sectionSettings.visible(inbox?.sections ?? []);
  const allSectionsHidden = (inbox?.sections.length ?? 0) > 0 && sections.length === 0;
  const isAll = selectedSection === ALL_SECTIONS || !sections.some((s) => s.sectionId === selectedSection);
  // In "All Sections" empty sections are noise; when one section is picked, show it even if empty.
  const visibleSections = isAll
    ? sections.filter((section) => section.prs.length > 0)
    : sections.filter((section) => section.sectionId === selectedSection);

  const {
    lookup,
    isLoading: isLoadingStatuses,
    revalidate: revalidateStatuses,
  } = usePullRequestStatuses(
    visibleSections.flatMap((section) => section.prs.filter((pr) => pr.state === "OPEN").map(toRef)),
  );
  const refresh = () => {
    revalidate();
    revalidateStatuses();
  };

  const sectionNamesByPr = new Map<string, string[]>();
  for (const section of inbox?.sections ?? []) {
    for (const pr of section.prs) {
      const key = refKey(toRef(pr));
      sectionNamesByPr.set(key, [...(sectionNamesByPr.get(key) ?? []), section.name]);
    }
  }

  const sharedActions = inbox ? (
    <ActionPanel.Section>
      <Action.Push
        title="Configure Sections…"
        icon={Icon.Eye}
        shortcut={SHORTCUTS.configureSections}
        target={<ConfigureSections sections={inbox.sections} appUrl={inbox.appUrl} />}
      />
      <Action.OpenInBrowser title="Open Graphite Inbox" icon={Icon.Tray} url={inbox.appUrl} />
    </ActionPanel.Section>
  ) : null;

  const githubUnavailable = lookup?.githubUnavailable;
  const errorKind = error instanceof InboxError ? error.kind : "UNEXPECTED";

  return (
    <List
      isLoading={isLoading || isLoadingStatuses}
      isShowingDetail={isShowingDetail && visibleSections.length > 0}
      searchBarPlaceholder="Search by title, number, repository, or author"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Inbox Section"
          value={isAll ? ALL_SECTIONS : selectedSection}
          onChange={setSelectedSection}
        >
          <List.Dropdown.Item title="All Sections" value={ALL_SECTIONS} icon={Icon.Tray} />
          <List.Dropdown.Section title="Sections">
            {sections.map((section) => (
              <List.Dropdown.Item
                key={section.sectionId}
                title={`${section.name} (${section.totalUnpaginatedPrs})`}
                value={section.sectionId}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && inbox ? (
        <List.Section title="Couldn't Refresh">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title={inboxErrorTitles[errorKind]}
            subtitle="Showing your last loaded inbox"
            accessories={[{ icon: Icon.Info, tooltip: error.message }]}
            actions={
              <ActionPanel>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
                {errorKind === "NOT_SET_UP" || errorKind === "SIGNED_OUT" ? (
                  <Action.OpenInBrowser title="Get a CLI Auth Token" url={GRAPHITE_CLI_AUTH_URL} />
                ) : null}
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                {sharedActions}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {!githubUnavailable && (lookup?.inaccessibleCount ?? 0) > 0 && !hideAccessHint && inbox ? (
        <List.Section title="Get More from Your Inbox">
          <List.Item
            icon={{ source: Icon.Lock, tintColor: Color.Orange }}
            title={`GitHub CLI Can't See ${pluralize(lookup?.inaccessibleCount ?? 0, "Pull Request")}`}
            subtitle="Its account may lack access, or an organization may require SSO authorization"
            accessories={[
              { icon: Icon.Info, tooltip: "Run `gh auth status` to see which account the GitHub CLI uses" },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Status Command" content="gh auth status" />
                <Action.CopyToClipboard title="Copy SSO Refresh Command" content="gh auth refresh" />
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidateStatuses} />
                <Action title="Don't Show Again" icon={Icon.XMarkCircle} onAction={() => setHideAccessHint(true)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {error && !inbox ? (
        <InboxErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={isAll ? Icon.Stars : Icon.CheckCircle}
          title={allSectionsHidden ? "All Sections Hidden" : isAll ? "Inbox Zero" : "Nothing Here"}
          description={
            allSectionsHidden
              ? "You've hidden every section. Choose which ones to show."
              : isAll
                ? "No pull requests need you right now. Go build something."
                : "This section is empty."
          }
          actions={
            allSectionsHidden && inbox ? (
              <ActionPanel>
                <Action.Push
                  title="Configure Sections…"
                  icon={Icon.Eye}
                  shortcut={SHORTCUTS.configureSections}
                  target={<ConfigureSections sections={inbox.sections} appUrl={inbox.appUrl} />}
                />
                <Action title="Show All Sections" icon={Icon.Eye} onAction={sectionSettings.reset} />
              </ActionPanel>
            ) : (
              <ActionPanel>
                <RefreshAction onRefresh={refresh} />
                {sharedActions}
              </ActionPanel>
            )
          }
        />
      )}

      {githubUnavailable && !hideGitHubHint && inbox ? (
        <List.Section title="Get More from Your Inbox">
          <List.Item
            icon={{ source: Icon.Plug, tintColor: Color.Blue }}
            title={
              githubUnavailable.reason === "NOT_INSTALLED"
                ? "Install the GitHub CLI to review from Raycast"
                : githubUnavailable.reason === "NOT_AUTHENTICATED"
                  ? "Sign in to the GitHub CLI to review from Raycast"
                  : "GitHub Data Unavailable"
            }
            subtitle={
              githubUnavailable.reason === "FAILED"
                ? githubUnavailable.message.length > 90
                  ? `${githubUnavailable.message.slice(0, 89)}…`
                  : githubUnavailable.message
                : "Approvals, comments, checks, and descriptions come from `gh`"
            }
            accessories={[{ icon: Icon.Info, tooltip: githubUnavailable.message }]}
            actions={
              <ActionPanel>
                {githubUnavailable.reason === "NOT_INSTALLED" ? (
                  <Action.OpenInBrowser title="Install the GitHub CLI" url={GITHUB_CLI_URL} />
                ) : null}
                {githubUnavailable.reason === "FAILED" ? (
                  <Action.CopyToClipboard title="Copy Error Message" content={githubUnavailable.message} />
                ) : (
                  <Action.CopyToClipboard title="Copy Sign-In Command" content="gh auth login" />
                )}
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidateStatuses} />
                <Action title="Don't Show Again" icon={Icon.XMarkCircle} onAction={() => setHideGitHubHint(true)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {inbox
        ? visibleSections.map((section: InboxSection) => (
            <List.Section
              key={section.sectionId}
              title={section.name}
              subtitle={
                section.totalUnpaginatedPrs > section.prs.length
                  ? `${section.prs.length} of ${section.totalUnpaginatedPrs}`
                  : pluralize(section.totalUnpaginatedPrs, "PR")
              }
            >
              {section.prs.map((pr) => {
                const key = refKey(toRef(pr));
                return (
                  <PullRequestItem
                    key={`${section.sectionId}-${key}`}
                    pr={pr}
                    inbox={inbox}
                    facts={factsFor(pr, lookup)}
                    githubAvailable={!lookup?.githubUnavailable}
                    sectionNames={sectionNamesByPr.get(key) ?? [section.name]}
                    isShowingDetail={isShowingDetail}
                    onToggleDetail={() => setShowingDetail(!isShowingDetail)}
                    onRefresh={refresh}
                    sharedActions={sharedActions}
                  />
                );
              })}
            </List.Section>
          ))
        : null}
    </List>
  );
}
