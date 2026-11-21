import { homedir } from "node:os";
import { join } from "node:path";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, open, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { downloadStatement, localStatementCopies, statementTitle } from "../downloads";
import { accountLabel, countOf, formatCurrency } from "../format";
import { MercuryLogin } from "../logins";
import {
  getAccounts,
  getStatements,
  getTreasuryAccounts,
  getTreasuryStatements,
  log,
  copyErrorAction,
  Statement,
  toError,
} from "../mercury";
import { readSnapshot } from "../balances";
import { FailureRows, LoginErrorView } from "./ErrorViews";

/** One account's statements: a bank account, or Treasury (which has no name in Mercury's API). */
interface AccountStatements {
  login: MercuryLogin;
  id: string;
  label: string;
  statements: Statement[];
}

type Failure = { login: MercuryLogin; error: Error; what?: string };

/** Load each source's statements; one failing must not hide the others. */
async function loadGroups(
  sources: Array<{ login: MercuryLogin; id: string; label: string; load: () => Promise<Statement[]> }>,
) {
  const groups: AccountStatements[] = [];
  const failures: Failure[] = [];
  await Promise.all(
    sources.map(async ({ login, id, label, load }) => {
      try {
        const statements = await load();
        groups.push({
          login,
          id,
          label,
          statements: [...statements].sort((a, b) => b.startDate.localeCompare(a.startDate)),
        });
      } catch (error) {
        const failure = toError(error);
        log.error("Couldn't load statements", { login: login.name, what: label, reason: failure.message });
        failures.push({ login, error: failure, what: `statements for ${label}` });
      }
    }),
  );
  return { groups, failures };
}

/** Bank statements for every login. Never waits on /treasury, which takes several seconds. */
async function loadBankStatements(logins: MercuryLogin[]) {
  const failures: Failure[] = [];
  const perLogin = await Promise.all(
    logins.map(async (login) => {
      try {
        return (await getAccounts(login.token)).map((account) => ({
          login,
          id: account.id,
          label: accountLabel(account),
          load: () => getStatements(login.token, account.id),
        }));
      } catch (error) {
        failures.push({ login, error: toError(error) });
        return [];
      }
    }),
  );
  const loaded = await loadGroups(perLogin.flat());
  return { groups: loaded.groups, failures: [...failures, ...loaded.failures] };
}

/**
 * Treasury's documents for one login, fetched only when chosen. The Treasury ID comes from the
 * cached balances, so choosing it doesn't wait on /treasury either.
 */
async function loadTreasuryStatements(login: MercuryLogin) {
  const cached = (await readSnapshot(login.id))?.treasury;
  let treasury = cached;
  if (!treasury) {
    try {
      treasury = await getTreasuryAccounts(login.token);
    } catch (error) {
      return { groups: [], failures: [{ login, error: toError(error) }] };
    }
  }
  return loadGroups(
    treasury.map((account) => ({
      login,
      id: account.id,
      label: "Treasury",
      load: () => getTreasuryStatements(login.token, account.id),
    })),
  );
}

/** Logins known to have Treasury, from cached balances, so the dropdown can offer it without asking Mercury. */
async function loginsWithTreasury(logins: MercuryLogin[]): Promise<Set<string>> {
  const snapshots = await Promise.all(logins.map((login) => readSnapshot(login.id)));
  return new Set(logins.filter((_, index) => snapshots[index]?.treasury?.length).map((login) => login.id));
}

function range(statement: Statement) {
  const format = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${format(statement.startDate)} – ${format(statement.endDate)}`;
}

const ALL = "all";
const DOWNLOADED = "downloaded";
const TREASURY = "treasury:";

export function StatementList({
  logins,
  initialFilter = ALL,
  onLoginsChanged,
}: {
  logins: MercuryLogin[];
  /** A bank account ID, or `treasury:<loginId>`, to open already filtered (from Manage Accounts). */
  initialFilter?: string;
  onLoginsChanged?: () => void;
}) {
  const [filter, setFilter] = useState(initialFilter);
  // In memory only (usePromise does not persist its arguments); the token makes an updated token refetch.
  const tokens = logins.map((login) => `${login.id}:${login.token}`).join(",");
  const treasuryLogin = filter.startsWith(TREASURY)
    ? logins.find((login) => filter === TREASURY + login.id)
    : undefined;

  const bank = usePromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_key: string) => loadBankStatements(logins),
    [tokens],
    { onError: () => {} },
  );
  const treasury = usePromise(
    (_key: string, loginId?: string) => loadTreasuryStatements(logins.find((login) => login.id === loginId)!),
    [tokens, treasuryLogin?.id],
    { execute: Boolean(treasuryLogin), onError: () => {} },
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: treasuries } = usePromise((_key: string) => loginsWithTreasury(logins), [tokens], {
    onError: () => {},
  });
  const {
    data: copies,
    isLoading: isLoadingCopies,
    revalidate: reloadCopies,
  } = usePromise(localStatementCopies, [], { onError: () => {} });

  // A deeplinked account that no longer exists would leave the dropdown pointing at nothing.
  useEffect(() => {
    const known = bank.data?.groups.some((group) => group.id === filter);
    if (bank.data && !known && filter !== ALL && filter !== DOWNLOADED && !filter.startsWith(TREASURY)) setFilter(ALL);
  }, [bank.data, filter]);

  const current = treasuryLogin ? treasury : bank;
  const data = current.data;
  const isLoading = current.isLoading;
  const revalidate = current.revalidate;
  const groups = (data?.groups ?? [])
    .filter((group) => filter === ALL || filter === DOWNLOADED || filter === group.id || treasuryLogin)
    .map((group) => ({
      ...group,
      statements: group.statements.filter((statement) => filter !== DOWNLOADED || copies?.get(statement.id)?.downloads),
    }))
    .filter((group) => group.statements.length > 0);
  const failure = data?.failures[0];
  const updated = () => (onLoginsChanged ? onLoginsChanged() : revalidate());
  const single = treasuryLogin
    ? (data?.groups[0]?.label ?? "Treasury")
    : filter !== ALL && filter !== DOWNLOADED
      ? bank.data?.groups.find((group) => group.id === filter)?.label
      : undefined;

  return (
    <List
      isLoading={isLoading || isLoadingCopies}
      navigationTitle={single ? `Statements · ${single}` : undefined}
      searchBarPlaceholder="Search statements…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Statements" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Accounts" value={ALL} />
          <List.Dropdown.Item title="Downloaded" value={DOWNLOADED} icon={Icon.Download} />
          {logins.map((login) => (
            <List.Dropdown.Section key={login.id} title={login.name}>
              {(bank.data?.groups ?? [])
                .filter((group) => group.login.id === login.id)
                .map((group) => (
                  <List.Dropdown.Item key={group.id} title={group.label} value={group.id} />
                ))}
              {(treasuries?.has(login.id) || treasuryLogin?.id === login.id) && (
                <List.Dropdown.Item title="Treasury" value={TREASURY + login.id} icon={Icon.LineChart} />
              )}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && groups.length === 0 && (data?.failures.length ?? 0) > 1 && (
        <FailureRows failures={data?.failures ?? []} onRetry={revalidate} onUpdated={updated} />
      )}
      {!isLoading && groups.length === 0 && data?.failures.length === 1 && failure && (
        <LoginErrorView login={failure.login} error={failure.error} onRetry={revalidate} onUpdated={updated} />
      )}
      {!isLoading && !isLoadingCopies && groups.length === 0 && !failure && (
        <List.EmptyView
          icon={filter === DOWNLOADED ? Icon.Download : Icon.Receipt}
          title={
            filter === DOWNLOADED
              ? "No statements downloaded yet"
              : single
                ? `No statements for ${single} yet`
                : "No statements yet"
          }
          description={
            filter === DOWNLOADED
              ? "Statements you've downloaded will appear here."
              : "Mercury issues a statement after each full month an account is open."
          }
        />
      )}
      {groups.length > 0 && <FailureRows failures={data?.failures ?? []} onRetry={revalidate} onUpdated={updated} />}
      {groups.map((group) => (
        <List.Section
          key={group.id}
          title={group.label}
          subtitle={[logins.length > 1 ? group.login.name : undefined, countOf(group.statements.length, "statement")]
            .filter(Boolean)
            .join(" · ")}
        >
          {group.statements.map((statement) => (
            <StatementItem
              key={statement.id}
              group={group}
              statement={statement}
              savedPath={copies?.get(statement.id)?.downloads}
              onDownloaded={reloadCopies}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function StatementItem({
  group,
  statement,
  savedPath,
  onDownloaded,
}: {
  group: AccountStatements;
  statement: Statement;
  savedPath?: string;
  onDownloaded: () => void;
}) {
  const { login, label } = group;
  const years = [...new Set(group.statements.map((item) => item.startDate.slice(0, 4)))];

  async function download() {
    await downloadStatement(login, label, statement).then(onDownloaded, () => {});
  }

  async function openPdf() {
    try {
      const path = savedPath ?? (await downloadStatement(login, label, statement));
      onDownloaded();
      await open(path);
    } catch (error) {
      // downloadStatement already showed its own toast for download failures.
      log.error("Couldn't open statement", { reason: error instanceof Error ? error.message : String(error) });
    }
  }

  async function downloadYear(year: string) {
    const statements = group.statements.filter((item) => item.startDate.startsWith(year));
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Downloading ${countOf(statements.length, "statement")}`,
      message: `${year} · ${label}`,
    });
    let done = 0;
    let failed = 0;
    await Promise.all(
      statements.map((item) =>
        downloadStatement(login, label, item, { quiet: true }).then(
          () => {
            done += 1;
            toast.message = `${done} of ${statements.length}`;
          },
          () => {
            failed += 1;
          },
        ),
      ),
    );
    onDownloaded();
    if (failed > 0) {
      const error = new Error(`${failed} of ${countOf(statements.length, "statement")} didn't download`);
      await showFailureToast(error, {
        title: `Downloaded ${done} of ${countOf(statements.length, "statement")}`,
        primaryAction: copyErrorAction(error),
      });
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = `Downloaded ${countOf(statements.length, "statement")}`;
    toast.message = "In Downloads";
    toast.primaryAction = { title: "Show in Finder", onAction: () => open(join(homedir(), "Downloads")) };
  }

  return (
    <List.Item
      icon={Icon.Document}
      title={statementTitle(statement)}
      subtitle={range(statement)}
      keywords={[statement.startDate.slice(0, 4)]}
      accessories={[
        ...(statement.endingBalance !== undefined
          ? [{ text: `Ending ${formatCurrency(statement.endingBalance)}` }]
          : []),
        ...(statement.documentType && statement.documentType !== "MonthlyStatement"
          ? [{ tag: statement.documentType === "TradeConfirmation" ? "Trade" : "Tax form" }]
          : []),
        ...(savedPath ? [{ icon: Icon.Download, tooltip: "Downloaded" }] : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Download Statement" icon={Icon.Download} onAction={download} />
            <Action title="Open Statement PDF" icon={Icon.Eye} onAction={openPdf} />
            {savedPath && (
              <Action
                title="Show in Finder"
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={() => showInFinder(savedPath)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title={label}>
            <ActionPanel.Submenu title="Download Statements" icon={Icon.Download}>
              {years.map((year) => {
                const count = group.statements.filter((item) => item.startDate.startsWith(year)).length;
                return (
                  <Action
                    key={year}
                    title={`${year} · ${count} ${count === 1 ? "Statement" : "Statements"}`}
                    onAction={() => downloadYear(year)}
                  />
                );
              })}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
