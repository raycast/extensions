import { Action, ActionPanel, Color, environment, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState, useLocalStorage } from "@raycast/utils";
import React, { useRef, useState } from "react";
import { PersonView } from "./components/details";
import { ReplyForm } from "./components/reply-form";
import { canReply, CaseFilter } from "./lib/outseta/client";
import { adminUrl, caseMarkdown, caseStatusLabel, caseTitle, parseDate } from "./lib/outseta/format";
import { Case, CaseSource, CaseStatus } from "./lib/outseta/types";
import { allowDevWrites, getClient, getSubdomain, showErrorToast, useSettledPagination } from "./lib/raycast";

type Filter = "unassigned" | "mine" | "open" | "closed";

function caseFilter(filter: Filter, myUid: string | undefined): CaseFilter {
  switch (filter) {
    case "unassigned":
      return { status: CaseStatus.Open, assignee: "unassigned" };
    case "mine":
      return { status: CaseStatus.Open, assignee: myUid ? { uid: myUid } : "unassigned" };
    case "open":
      return { status: CaseStatus.Open };
    case "closed":
      return { status: CaseStatus.Closed };
  }
}

const sourceIcons: Record<CaseSource, Icon> = {
  [CaseSource.Website]: Icon.Globe,
  [CaseSource.Email]: Icon.Envelope,
  [CaseSource.Facebook]: Icon.Person,
  [CaseSource.Twitter]: Icon.Bird,
  [CaseSource.Chat]: Icon.SpeechBubble,
};

function shortcut(key: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut {
  const extra: Keyboard.KeyModifier[] = shift ? ["shift"] : [];
  return { macOS: { modifiers: ["cmd", ...extra], key }, Windows: { modifiers: ["ctrl", ...extra], key } };
}

const filterTitles: Record<Filter, string> = {
  unassigned: "Unassigned",
  mine: "Assigned to Me",
  open: "All Open",
  closed: "Closed",
};
const filterKeys: Record<Filter, Keyboard.KeyEquivalent> = { unassigned: "1", mine: "2", open: "3", closed: "4" };

// Hint the filter shortcuts in the dropdown, where people look for filters.
const modifierLabel = process.platform === "win32" ? "Ctrl+" : "⌘";
function dropdownTitle(filter: Filter) {
  return `${filterTitles[filter]}  ${modifierLabel}${filterKeys[filter]}`;
}

function FilterActions(props: { current: Filter; hasMe: boolean; onChange: (filter: Filter) => void }) {
  const filters = (Object.keys(filterTitles) as Filter[]).filter((f) => f !== "mine" || props.hasMe);
  return (
    <ActionPanel.Section title="Filter">
      {filters
        .filter((f) => f !== props.current)
        .map((f) => (
          <Action
            key={f}
            title={`Show ${filterTitles[f]}`}
            icon={Icon.Filter}
            shortcut={shortcut(filterKeys[f])}
            onAction={() => props.onChange(f)}
          />
        ))}
    </ActionPanel.Section>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useCachedState<Filter>("cases-filter", "unassigned");
  const [selectedUid, setSelectedUid] = useState<string>();
  // Agents aren't exposed by the API, so "me" is learned from a case the user says is assigned to them.
  // Agent uids belong to one Outseta account, hence the subdomain in the key.
  const {
    value: myUid,
    setValue: setMyUid,
    isLoading: isLoadingMe,
  } = useLocalStorage<string>(`my-agent-uid:${getSubdomain()}`);
  const effectiveFilter = filter === "mine" && !myUid ? "unassigned" : filter;

  const abortable = useRef<AbortController>(null);
  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (query: string, activeFilter: Filter, me: string | undefined) => async (options: { page: number }) => {
      const page = await getClient().searchCases(
        { query: query.trim() || undefined, page: options.page, filter: caseFilter(activeFilter, me) },
        { signal: abortable.current?.signal },
      );
      return { data: page.items, hasMore: page.hasMore };
    },
    [searchText, effectiveFilter, myUid],
    {
      abortable,
      execute: !isLoadingMe,
      keepPreviousData: true,
      onError: (error) => showErrorToast(error, "Couldn't load cases"),
    },
  );
  const settledPagination = useSettledPagination(pagination, isLoading);

  async function rememberMe(supportCase: Case) {
    const uid = supportCase.AssignedToPersonClientIdentifier;
    if (!uid) return;
    await setMyUid(uid);
    setFilter("mine");
    await showToast({ style: Toast.Style.Success, title: "Saved", message: '"Assigned to Me" now shows your cases' });
  }

  return (
    <List
      isLoading={isLoading || isLoadingMe}
      isShowingDetail={!!data?.length}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedUid(id ?? undefined)}
      searchBarPlaceholder="Search cases"
      throttle
      pagination={settledPagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter cases" value={effectiveFilter} onChange={(v) => setFilter(v as Filter)}>
          <List.Dropdown.Item title={dropdownTitle("unassigned")} value="unassigned" icon={Icon.Tray} />
          {myUid ? <List.Dropdown.Item title={dropdownTitle("mine")} value="mine" icon={Icon.Person} /> : null}
          <List.Dropdown.Item title={dropdownTitle("open")} value="open" icon={Icon.Envelope} />
          <List.Dropdown.Item title={dropdownTitle("closed")} value="closed" icon={Icon.CheckCircle} />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.CheckCircle}
        title={searchText ? "No matching cases" : "No cases here"}
        description={
          !myUid && !searchText
            ? 'To filter by "Assigned to Me", select a case assigned to you and run "This Is Me" (⌘⇧M).'
            : undefined
        }
        actions={
          <ActionPanel>
            <FilterActions current={effectiveFilter} hasMe={!!myUid} onChange={setFilter} />
          </ActionPanel>
        }
      />
      {data?.map((supportCase) => (
        <CaseItem
          key={supportCase.Uid}
          supportCase={supportCase}
          selected={supportCase.Uid === selectedUid}
          myUid={myUid}
          onChanged={revalidate}
          onRememberMe={rememberMe}
          filterActions={<FilterActions current={effectiveFilter} hasMe={!!myUid} onChange={setFilter} />}
        />
      ))}
    </List>
  );
}

function CaseItem(props: {
  supportCase: Case;
  selected: boolean;
  myUid: string | undefined;
  onChanged: () => void;
  onRememberMe: (supportCase: Case) => void;
  filterActions: React.ReactNode;
}) {
  const { supportCase, myUid } = props;
  // Cancels the request when the selection moves on, as in usePerson.
  const detailAbortable = useRef<AbortController>(null);
  const {
    data: detail,
    isLoading,
    revalidate,
  } = useCachedPromise(
    (uid: string) => getClient().getCase(uid, { signal: detailAbortable.current?.signal }),
    [supportCase.Uid],
    {
      abortable: detailAbortable,
      execute: props.selected,
      onError: (error) => showErrorToast(error, "Couldn't load case"),
    },
  );
  const full = detail ?? supportCase;
  const assignedToMe = !!myUid && supportCase.AssignedToPersonClientIdentifier === myUid;
  const lastActivity = parseDate(supportCase.LastActivity ?? supportCase.SubmittedDateTime);

  const accessories: List.Item.Accessory[] = [];
  if (assignedToMe)
    accessories.push({ icon: { source: Icon.Person, tintColor: Color.Blue }, tooltip: "Assigned to you" });
  if (supportCase.Status !== CaseStatus.Open) accessories.push({ tag: caseStatusLabel(supportCase.Status) });
  if (lastActivity) accessories.push({ date: lastActivity, tooltip: "Last activity" });

  const onSent = () => {
    revalidate();
    props.onChanged();
  };

  return (
    <List.Item
      id={supportCase.Uid}
      title={caseTitle(supportCase)}
      icon={supportCase.Source ? sourceIcons[supportCase.Source] : Icon.Envelope}
      accessories={accessories}
      detail={<List.Item.Detail isLoading={isLoading} markdown={detail ? caseMarkdown(full) : undefined} />}
      actions={
        <ActionPanel>
          {canReply(full) ? (
            <Action.Push title="Reply" icon={Icon.Reply} target={<ReplyForm supportCase={full} onSent={onSent} />} />
          ) : null}
          <Action.OpenInBrowser title="Open in Outseta" url={adminUrl(getSubdomain(), "case", supportCase.Uid)} />
          {full.FromPerson?.Uid ? (
            <Action.Push
              title="Show Customer"
              icon={Icon.Person}
              shortcut={shortcut("p", true)}
              target={<PersonView uid={full.FromPerson.Uid} />}
            />
          ) : null}
          {supportCase.AssignedToPersonClientIdentifier && !assignedToMe ? (
            <Action
              title="This Is Me"
              icon={Icon.PersonCircle}
              shortcut={shortcut("m", true)}
              onAction={() => props.onRememberMe(supportCase)}
            />
          ) : null}
          {environment.isDevelopment ? (
            <Action
              title="Allow Replies to This Case (Dev)"
              icon={Icon.LockUnlocked}
              onAction={async () => {
                await allowDevWrites(supportCase.Uid);
                await showToast({ style: Toast.Style.Success, title: "Replies allowed for this case" });
              }}
            />
          ) : null}
          {props.filterActions}
          <ActionPanel.Section>
            {full.FromPerson?.Email ? (
              <Action.CopyToClipboard
                title="Copy Customer Email"
                content={full.FromPerson.Email}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Case Link"
              content={adminUrl(getSubdomain(), "case", supportCase.Uid)}
              shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onSent}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
