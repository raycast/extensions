import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getSelectedText,
  showToast,
  type LaunchProps,
} from "@raycast/api";
import { useCachedPromise, useFrecencySorting, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { DomainDetail, DomainRecordDetail } from "./components/domain-detail";
import { RecordDetail, ResultDetail } from "./components/result-detail";
import { fetchCredits, type BouncerStatus } from "./lib/bouncer";
import { isValidDomain, normalizeDomain } from "./lib/domain";
import { extractEmail, isValidEmail, normalizeEmail } from "./lib/email";
import { formatVerifiedAt, useHistory, type HistoryEntry } from "./lib/history";
import { getVerdict } from "./lib/verdict";

const BOUNCER_APP_URL = "https://app.usebouncer.com";

/** Stable id so the Check row can be selected the moment it appears. */
const CHECK_ITEM_ID = "check-target";

type Filter = BouncerStatus | "all" | "domains";
type History = ReturnType<typeof useHistory>;

/**
 * One command for both checks. An address contains an "@" and a domain does not,
 * so the input already says which endpoint to hit — there is nothing for the user to pick.
 */
type Target = { kind: "email"; value: string } | { kind: "domain"; value: string } | { kind: "none"; value: string };

function resolveTarget(input: string): Target {
  const trimmed = input.trim();
  if (!trimmed) return { kind: "none", value: "" };

  const asEmail = normalizeEmail(trimmed);
  if (isValidEmail(asEmail)) return { kind: "email", value: asEmail };

  // Pasting "Bob <bob@example.com>" or a signature block should still work.
  const extracted = extractEmail(trimmed);
  if (extracted) return { kind: "email", value: extracted };

  const asDomain = normalizeDomain(trimmed);
  if (isValidDomain(asDomain)) return { kind: "domain", value: asDomain };

  return { kind: "none", value: trimmed };
}

export default function VerifyCommand(props: LaunchProps<{ arguments: Arguments.VerifyEmail }>) {
  const history = useHistory();

  // Raycast hands root-search text to a fallback command as `fallbackText`, never as an
  // argument, so both have to be read. Either way the user picked this command on purpose.
  const launched = resolveTarget(props.arguments?.query || props.fallbackText || "");

  // Launched with something usable: skip the list and go straight to the result.
  if (launched.kind === "email") {
    return <ResultDetail email={launched.value} onVerified={history.addEmail} />;
  }
  if (launched.kind === "domain") {
    return <DomainDetail domain={launched.value} onChecked={history.addDomain} />;
  }

  return <SearchView history={history} initialText={launched.value} />;
}

function SearchView({ history, initialText }: { history: History; initialText: string }) {
  const [searchText, setSearchText] = useState(initialText);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [seeded, setSeeded] = useState(initialText.length > 0);

  // Prefill from whatever the user already has in hand — selection first, then clipboard.
  usePromise(
    async () => {
      if (seeded) return undefined;
      const selected = await getSelectedText().catch(() => undefined);
      const clipboard = selected ?? (await Clipboard.readText().catch(() => undefined));
      const target = resolveTarget(clipboard ?? "");
      return target.kind === "none" ? undefined : target.value;
    },
    [],
    {
      onData: (candidate) => {
        setSeeded(true);
        if (candidate) setSearchText(candidate);
      },
      onError: () => setSeeded(true),
    },
  );

  const { data: credits } = useCachedPromise(fetchCredits, [], { onError: () => undefined });

  const target = resolveTarget(searchText);
  const query = searchText.trim().toLowerCase();

  // Frequently reopened addresses float up; everything unvisited stays newest-first.
  const { data: ranked, visitItem } = useFrecencySorting(history.entries, {
    key: history.entryKey,
    sortUnvisited: (a, b) => b.verifiedAt - a.verifiedAt,
  });

  // Once the input resolves to a real address or domain it is a target, not a search term,
  // so it must not filter the list — otherwise typing one narrows history to a single row.
  // Partial text still searches, which is how you find something you checked before.
  const isTargeted = target.kind !== "none";

  // A new target appears above the history, but Raycast keeps the selection where it was,
  // so Enter would reopen a saved result instead of checking what was just typed.
  useEffect(() => {
    if (target.kind !== "none") setSelectedId(CHECK_ITEM_ID);
  }, [target.kind, target.value]);

  const visibleEntries = ranked.filter((entry) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "domains" ? entry.kind === "domain" : entry.kind === "email" && entry.record.status === filter);
    return matchesFilter && (isTargeted || !query || entry.subject.toLowerCase().includes(query));
  });

  return (
    <List
      isLoading={history.isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchBarPlaceholder="Enter an email address or a domain"
      filtering={false}
      searchBarAccessory={
        history.entries.length > 0 ? (
          <List.Dropdown tooltip="Filter History" value={filter} onChange={(v) => setFilter(v as Filter)}>
            <List.Dropdown.Item title="Everything" value="all" icon={Icon.Circle} />
            <List.Dropdown.Item title="Deliverable" value="deliverable" icon={Icon.CheckCircle} />
            <List.Dropdown.Item title="Risky" value="risky" icon={Icon.Warning} />
            <List.Dropdown.Item title="Undeliverable" value="undeliverable" icon={Icon.XMarkCircle} />
            <List.Dropdown.Item title="Unknown" value="unknown" icon={Icon.QuestionMarkCircle} />
            <List.Dropdown.Item title="Domains" value="domains" icon={Icon.Globe} />
          </List.Dropdown>
        ) : null
      }
    >
      {searchText.trim().length > 0 ? (
        <List.Section title="Check">
          <TargetItem target={target} raw={searchText} history={history} credits={credits} />
        </List.Section>
      ) : null}

      {visibleEntries.length > 0 ? (
        <List.Section title="Recent" subtitle={`${visibleEntries.length}`}>
          {visibleEntries.map((entry) => (
            <HistoryItem
              key={history.entryKey(entry)}
              id={history.entryKey(entry)}
              entry={entry}
              history={history}
              onVisit={() => visitItem(entry)}
            />
          ))}
        </List.Section>
      ) : null}

      <List.EmptyView
        icon={Icon.Envelope}
        title={searchText.trim() ? "Nothing in History" : "Verify an Email or a Domain"}
        description={emptyDescription(searchText, credits, history.enabled)}
        actions={
          <ActionPanel>
            <Action
              title="Paste from Clipboard"
              icon={Icon.Clipboard}
              onAction={async () => {
                const text = await Clipboard.readText().catch(() => undefined);
                const found = resolveTarget(text ?? "");
                if (found.kind === "none") {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "No Email or Domain on the Clipboard",
                  });
                  return;
                }
                setSearchText(found.value);
              }}
            />
            <Action.OpenInBrowser title="Open Bouncer Dashboard" url={BOUNCER_APP_URL} icon={Icon.Globe} />
            {history.hasStoredWhileDisabled ? (
              <Action
                title="Clear Saved History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Clear Saved History?",
                    message:
                      "History recording is off, but earlier results are still stored on this device. This deletes them.",
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  });
                  if (confirmed) await history.clear();
                }}
              />
            ) : null}
          </ActionPanel>
        }
      />
    </List>
  );
}

/** The empty view is where the credit balance is most useful — before you spend one. */
function emptyDescription(searchText: string, credits: number | undefined, historyEnabled: boolean): string {
  if (searchText.trim()) return "Press Enter to check this with Bouncer.";

  const parts = [
    "Type an address to check the mailbox, or a bare domain to check its mail setup. Copy one before opening and it is filled in for you.",
  ];
  if (credits !== undefined) {
    parts.push(
      credits === 0
        ? "You have no Bouncer credits left."
        : `${credits.toLocaleString()} Bouncer ${credits === 1 ? "credit" : "credits"} remaining.`,
    );
  }
  if (!historyEnabled) parts.push("History recording is off.");
  return parts.join("\n\n");
}

function TargetItem({
  target,
  raw,
  history,
  credits,
}: {
  target: Target;
  raw: string;
  history: History;
  credits: number | undefined;
}) {
  const accessories = [
    ...(credits === undefined
      ? []
      : [
          {
            tag: {
              value: `${credits.toLocaleString()} credits`,
              color: credits === 0 ? Color.Red : credits < 100 ? Color.Orange : Color.SecondaryText,
            },
            tooltip: "Bouncer credits remaining",
          },
        ]),
  ];

  if (target.kind === "none") {
    return (
      <List.Item
        id={CHECK_ITEM_ID}
        title={target.value}
        subtitle="Not a valid email address or domain"
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Input" content={target.value} />
          </ActionPanel>
        }
      />
    );
  }

  // Re-checking something already in history costs another credit for a result you
  // already have, so say so and offer the stored one first.
  const previous = history.entries.find((e) => e.kind === target.kind && e.subject === target.value);
  const checkedNote = previous ? `Checked ${formatVerifiedAt(previous.verifiedAt).toLowerCase()}` : undefined;

  if (target.kind === "domain") {
    return (
      <List.Item
        id={CHECK_ITEM_ID}
        title={target.value}
        subtitle={checkedNote ? `Domain · ${checkedNote}` : "Domain · Press Enter to check its mail setup"}
        icon={{ source: Icon.Globe, tintColor: Color.PrimaryText }}
        accessories={accessories}
        actions={
          <ActionPanel>
            {previous ? (
              <Action.Push
                title="Open Saved Result"
                icon={Icon.Eye}
                target={<SavedResult entry={previous} history={history} />}
              />
            ) : null}
            <Action.Push
              title={previous ? "Check Again" : "Check Domain"}
              icon={Icon.CheckCircle}
              target={<DomainDetail domain={target.value} onChecked={history.addDomain} />}
            />
            <Action.CopyToClipboard title="Copy Domain" content={target.value} />
          </ActionPanel>
        }
      />
    );
  }

  const domain = normalizeDomain(target.value);
  const extracted = target.value !== normalizeEmail(raw.trim());

  return (
    <List.Item
      id={CHECK_ITEM_ID}
      title={target.value}
      subtitle={
        checkedNote
          ? `Email · ${checkedNote}`
          : extracted
            ? "Email · Found in your input"
            : "Email · Press Enter to verify the mailbox"
      }
      icon={{ source: Icon.Envelope, tintColor: Color.PrimaryText }}
      accessories={accessories}
      actions={
        <ActionPanel>
          {previous ? (
            <Action.Push
              title="Open Saved Result"
              icon={Icon.Eye}
              target={<SavedResult entry={previous} history={history} />}
            />
          ) : null}
          <Action.Push
            title={previous ? "Verify Again" : "Verify Email"}
            icon={Icon.CheckCircle}
            target={<ResultDetail email={target.value} onVerified={history.addEmail} />}
          />
          <Action.Push
            title={`Check ${domain} Instead`}
            icon={Icon.Globe}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "d" },
              Windows: { modifiers: ["ctrl", "shift"], key: "d" },
            }}
            target={<DomainDetail domain={domain} onChecked={history.addDomain} />}
          />
          <Action.CopyToClipboard title="Copy Email" content={target.value} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Email rows show Bouncer's status. Domain responses carry no status, so a domain row is
 * shown neutrally rather than given a verdict the API never returned.
 */
function summarize(entry: HistoryEntry) {
  if (entry.kind === "email") {
    const { label, color, icon } = getVerdict(entry.record.status);
    return { label, color, icon, subtitle: entry.record.domain?.name, score: entry.record.score };
  }
  return {
    label: "Domain",
    color: Color.SecondaryText,
    icon: Icon.Globe,
    subtitle: entry.record.provider,
    score: undefined,
  };
}

function HistoryItem({
  entry,
  id,
  history,
  onVisit,
}: {
  entry: HistoryEntry;
  id: string;
  history: History;
  onVisit: () => void;
}) {
  const { label, color, icon, subtitle, score } = summarize(entry);

  return (
    <List.Item
      id={id}
      title={entry.subject}
      subtitle={subtitle}
      icon={{ source: icon, tintColor: color }}
      accessories={[
        ...(score === undefined ? [] : [{ tag: { value: String(score), color } }]),
        {
          text: formatVerifiedAt(entry.verifiedAt),
          tooltip: `${label} · ${new Date(entry.verifiedAt).toLocaleString()}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Saved Result"
              icon={Icon.Eye}
              onPush={onVisit}
              target={<SavedResult entry={entry} history={history} />}
            />
            <Action.Push
              title="Check Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onPush={onVisit}
              target={
                entry.kind === "email" ? (
                  <ResultDetail email={entry.subject} onVerified={history.addEmail} />
                ) : (
                  <DomainDetail domain={entry.subject} onChecked={history.addDomain} />
                )
              }
            />
            <Action.CopyToClipboard title="Copy" content={entry.subject} onCopy={onVisit} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Remove from History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => history.remove(entry)}
            />
            <Action
              title="Clear History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Clear Verification History?",
                  message: "This removes every saved result. Bouncer credits are not affected.",
                  primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
                });
                if (confirmed) await history.clear();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Shows a stored result without spending another credit. */
function SavedResult({ entry, history }: { entry: HistoryEntry; history: History }) {
  const [refreshing, setRefreshing] = useState(false);

  if (entry.kind === "domain") {
    return refreshing ? (
      <DomainDetail domain={entry.subject} onChecked={history.addDomain} />
    ) : (
      <DomainRecordDetail record={entry.record} onRetry={() => setRefreshing(true)} />
    );
  }

  return refreshing ? (
    <ResultDetail email={entry.subject} onVerified={history.addEmail} />
  ) : (
    <RecordDetail record={entry.record} onRetry={() => setRefreshing(true)} />
  );
}
