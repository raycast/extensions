import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import React, { useEffect, useRef, useState } from "react";
import {
  createApplePwClient,
  type ApplePwClient,
  type ApplePwCommandOutcome,
  type ApplePwOtpEntry,
  type ApplePwPasswordEntry,
} from "./applepw";
import { createAccountRepository, type AccountRecord, type AccountRepository, type DiscoveredAccount } from "./db";

type PendingAction =
  | { kind: "search"; query: string }
  | { kind: "password"; account: AccountRecord }
  | { kind: "otp"; account: AccountRecord };

export interface SearchResultsOutcome {
  kind: "results";
  query: string;
  rows: AccountRecord[];
}

export interface AuthRequiredOutcome {
  kind: "auth-required";
  prompt: string;
  pendingAction: PendingAction;
}

export interface SecretOutcome {
  kind: "secret";
  action: "password" | "otp";
  account: AccountRecord;
  value: string;
}

export type PasswordSearchOutcome = SearchResultsOutcome | AuthRequiredOutcome | SecretOutcome;

export interface PasswordSearchWorkflow {
  search(query: string): Promise<PasswordSearchOutcome>;
  fetchPassword(account: AccountRecord): Promise<PasswordSearchOutcome>;
  fetchOtp(account: AccountRecord): Promise<PasswordSearchOutcome>;
  importAccounts(accounts: DiscoveredAccount[], query: string): Promise<SearchResultsOutcome>;
  submitPin(pin: string): Promise<PasswordSearchOutcome>;
}

export interface PasswordSearchWorkflowOptions {
  applePw: ApplePwClient;
  repository: Pick<AccountRepository, "upsertDiscoveredAccounts" | "markAccountUsed" | "searchAccounts">;
}

type UiRuntime = {
  Action: typeof import("@raycast/api").Action;
  ActionPanel: typeof import("@raycast/api").ActionPanel;
  Clipboard: typeof import("@raycast/api").Clipboard;
  Detail: typeof import("@raycast/api").Detail;
  Form: typeof import("@raycast/api").Form;
  Icon: typeof import("@raycast/api").Icon;
  List: typeof import("@raycast/api").List;
  Toast: typeof import("@raycast/api").Toast;
  popToRoot: typeof import("@raycast/api").popToRoot;
  showHUD: typeof import("@raycast/api").showHUD;
  showToast: typeof import("@raycast/api").showToast;
};

const require = createRequire(join(process.cwd(), "package.json"));
const defaultApplePwClient = createApplePwClient();
let uiRuntime: UiRuntime | null = null;
export const APPLEPW_INSTALL_COMMAND = "brew install alecharmon/tap/applepw";

function getUiRuntime(): UiRuntime {
  if (uiRuntime) {
    return uiRuntime;
  }

  const api = require("@raycast/api") as typeof import("@raycast/api");
  uiRuntime = {
    Action: api.Action,
    ActionPanel: api.ActionPanel,
    Clipboard: api.Clipboard,
    Detail: api.Detail,
    Form: api.Form,
    Icon: api.Icon,
    List: api.List,
    Toast: api.Toast,
    popToRoot: api.popToRoot,
    showHUD: api.showHUD,
    showToast: api.showToast,
  };
  return uiRuntime;
}

function mapPasswordEntries(entries: ApplePwPasswordEntry[]) {
  return entries.map((entry) => ({
    domain: entry.domain,
    username: entry.username,
    hasOtp: Boolean(entry.has_otp),
  }));
}

function selectPasswordValue(result: ApplePwCommandOutcome<ApplePwPasswordEntry[]>): string {
  const entry = result.kind === "success" ? result.payload[0] : undefined;
  const password = entry?.password?.trim();
  if (!password) {
    throw new Error("applepw did not return a password");
  }
  return password;
}

function selectOtpValue(result: ApplePwCommandOutcome<ApplePwOtpEntry[]>, account: AccountRecord): string {
  const entries = result.kind === "success" ? result.payload : [];
  const entry = entries.find((candidate) => candidate.username === account.username) ?? entries[0];
  const code = entry?.code?.trim();
  if (!code) {
    throw new Error("applepw did not return a 2FA code");
  }
  return code;
}

function outcomeFromAuthRequired(prompt: string, pendingAction: PendingAction): AuthRequiredOutcome {
  return {
    kind: "auth-required",
    prompt,
    pendingAction,
  };
}

function normalizeImportedHostname(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.trim().replace(/\.$/, "").toLowerCase();
    return hostname || null;
  } catch {
    return null;
  }
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];

    if (inQuotes) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (character === "\r" || character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";

      if (character === "\r" && csv[index + 1] === "\n") {
        index += 1;
      }
      continue;
    }

    field += character;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function parsePasswordsCsv(csv: string): DiscoveredAccount[] {
  const rows = parseCsvRows(csv);
  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((value) =>
    value
      .trim()
      .replace(/^\uFEFF/, "")
      .toLowerCase(),
  );
  const urlIndex = header.indexOf("url");
  const usernameIndex = header.indexOf("username");
  const otpAuthIndex = header.indexOf("otpauth");

  if (urlIndex === -1 || usernameIndex === -1) {
    throw new Error("CSV must include URL and Username columns");
  }

  const accounts = new Map<string, DiscoveredAccount>();
  for (const row of rows.slice(1)) {
    const username = row[usernameIndex]?.trim();
    const domain = normalizeImportedHostname(row[urlIndex] ?? "");

    if (!domain || !username) {
      continue;
    }

    const key = `${domain}\u0000${username}`;
    const hasOtp = Boolean(row[otpAuthIndex]?.trim());
    const existing = accounts.get(key);

    if (existing) {
      existing.hasOtp = existing.hasOtp || hasOtp;
      continue;
    }

    accounts.set(key, {
      domain,
      username,
      hasOtp,
    });
  }

  return [...accounts.values()];
}

export async function loadPasswordsCsv(filePath: string): Promise<DiscoveredAccount[]> {
  const csv = await readFile(filePath, "utf8");
  const accounts = parsePasswordsCsv(csv);
  if (accounts.length === 0) {
    throw new Error("No importable accounts were found in that CSV file");
  }
  return accounts;
}

export function createPasswordSearchWorkflow(options: PasswordSearchWorkflowOptions): PasswordSearchWorkflow {
  const { applePw, repository } = options;
  let pendingAction: PendingAction | null = null;
  let activeRequestId = 0;

  function setPendingAction(requestId: number, action: PendingAction) {
    if (requestId === activeRequestId) {
      pendingAction = action;
    }
  }

  function clearPendingAction(requestId: number) {
    if (requestId === activeRequestId) {
      pendingAction = null;
    }
  }

  async function runSearch(query: string): Promise<PasswordSearchOutcome> {
    const trimmedQuery = query.trim();
    const requestId = ++activeRequestId;

    if (!trimmedQuery) {
      clearPendingAction(requestId);
      return {
        kind: "results",
        query,
        rows: [],
      };
    }

    const liveResult = await applePw.listPasswords(trimmedQuery);
    if (liveResult.kind === "auth-required") {
      const action = { kind: "search", query: trimmedQuery } as PendingAction;
      setPendingAction(requestId, action);
      return outcomeFromAuthRequired(liveResult.prompt, action);
    }

    await repository.upsertDiscoveredAccounts(mapPasswordEntries(liveResult.payload));
    const rows = await repository.searchAccounts(trimmedQuery);
    clearPendingAction(requestId);

    return {
      kind: "results",
      query: trimmedQuery,
      rows,
    };
  }

  async function runPassword(account: AccountRecord): Promise<PasswordSearchOutcome> {
    const requestId = ++activeRequestId;
    const result = await applePw.getPassword(account.domain, account.username);
    if (result.kind === "auth-required") {
      const action = { kind: "password", account } as PendingAction;
      setPendingAction(requestId, action);
      return outcomeFromAuthRequired(result.prompt, action);
    }
    clearPendingAction(requestId);
    await repository.markAccountUsed(account.domain, account.username);
    const value = selectPasswordValue(result);
    return {
      kind: "secret",
      action: "password",
      account,
      value,
    };
  }

  async function runOtp(account: AccountRecord): Promise<PasswordSearchOutcome> {
    const requestId = ++activeRequestId;
    const result = await applePw.getOtp(account.domain);
    if (result.kind === "auth-required") {
      const action = { kind: "otp", account } as PendingAction;
      setPendingAction(requestId, action);
      return outcomeFromAuthRequired(result.prompt, action);
    }

    clearPendingAction(requestId);
    await repository.markAccountUsed(account.domain, account.username);
    return {
      kind: "secret",
      action: "otp",
      account,
      value: selectOtpValue(result, account),
    };
  }

  async function submitPin(pin: string): Promise<PasswordSearchOutcome> {
    if (!pendingAction) {
      await applePw.authenticate(pin);
      return {
        kind: "results",
        query: "",
        rows: [],
      };
    }

    await applePw.authenticate(pin);
    const action = pendingAction;
    pendingAction = null;

    switch (action.kind) {
      case "search":
        return await runSearch(action.query);
      case "password":
        return await runPassword(action.account);
      case "otp":
        return await runOtp(action.account);
    }
  }

  return {
    search: runSearch,
    fetchPassword: runPassword,
    fetchOtp: runOtp,
    importAccounts: async (accounts: DiscoveredAccount[], query: string) => {
      const requestId = ++activeRequestId;
      await repository.upsertDiscoveredAccounts(accounts);
      const trimmedQuery = query.trim();
      const rows = trimmedQuery ? await repository.searchAccounts(trimmedQuery) : [];
      clearPendingAction(requestId);

      return {
        kind: "results",
        query: trimmedQuery,
        rows,
      };
    },
    submitPin,
  };
}

async function copySecretAndNotify(outcome: SecretOutcome): Promise<void> {
  const ui = getUiRuntime();
  await ui.Clipboard.copy(outcome.value, { concealed: true });
  await ui.showHUD(outcome.action === "password" ? "Password copied" : "2FA code copied");
}

async function presentError(error: unknown): Promise<void> {
  const ui = getUiRuntime();
  const message = error instanceof Error ? error.message : "Unknown error";
  await ui.showToast({
    style: ui.Toast.Style.Failure,
    title: "Apple Passwords",
    message,
  });
}

function SecretActionListItem({
  account,
  onPassword,
  onOtp,
  onImportCsv,
}: {
  account: AccountRecord;
  onPassword: (account: AccountRecord) => Promise<void>;
  onOtp: (account: AccountRecord) => Promise<void>;
  onImportCsv: (filePath: string) => Promise<void>;
}) {
  const ui = getUiRuntime();
  const h = React.createElement;

  return h(ui.List.Item, {
    title: account.domain,
    subtitle: account.username,
    accessories: account.hasOtp ? [{ icon: ui.Icon.Key, text: "OTP" }] : undefined,
    actions: h(
      ui.ActionPanel,
      null,
      h(ui.Action, {
        title: "Copy Password",
        icon: ui.Icon.Key,
        onAction: () => void onPassword(account),
      }),
      account.hasOtp
        ? h(ui.Action, {
            title: "Copy 2FA Code",
            icon: ui.Icon.Wand,
            onAction: () => void onOtp(account),
          })
        : null,
      createImportCsvAction(onImportCsv),
    ),
  });
}

export function AuthPromptForm({ prompt, onSubmit }: { prompt: string; onSubmit: (pin: string) => Promise<void> }) {
  const ui = getUiRuntime();
  const h = React.createElement;

  return h(
    ui.Form,
    {
      actions: h(ui.ActionPanel, null, h(ui.Action.SubmitForm, createAuthPromptSubmitActionProps(onSubmit))),
    },
    h(ui.Form.Description, createAuthPromptDescriptionProps(prompt)),
    h(ui.Form.PasswordField, createAuthPromptFieldProps()),
  );
}

export function createAuthPromptSubmitActionProps(onSubmit: (pin: string) => Promise<void>) {
  return {
    title: "Continue",
    onSubmit: async (values: { pin?: string }) => {
      await onSubmit(values.pin?.trim() ?? "");
    },
  };
}

export function createAuthPromptFieldProps() {
  return {
    id: "pin",
    title: "Code",
    placeholder: "Enter your Apple Passwords code",
    autoFocus: true,
  };
}

export function createAuthPromptDescriptionProps(prompt: string) {
  return {
    title: "Unlock Apple Passwords",
    text: prompt,
  };
}

export function isMissingApplePwBinaryError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Unable to locate applepw binary");
}

export function createMissingBinaryMarkdown() {
  return [
    "# Install Apple Passwords CLI",
    "",
    "This command needs the local `applepw` CLI before it can search your Apple Passwords cache.",
    "",
    "## Install",
    "",
    "```bash",
    APPLEPW_INSTALL_COMMAND,
    "```",
    "",
    "After installing, reopen the command and authenticate.",
  ].join("\n");
}

function MissingBinaryView() {
  const ui = getUiRuntime();
  const h = React.createElement;

  return h(ui.Detail, {
    markdown: createMissingBinaryMarkdown(),
    actions: h(
      ui.ActionPanel,
      null,
      h(ui.Action.CopyToClipboard, {
        title: "Copy Install Command",
        content: APPLEPW_INSTALL_COMMAND,
      }),
      h(ui.Action.Open, {
        title: "Open Terminal",
        target: "/System/Applications/Utilities/Terminal.app",
      }),
    ),
  });
}

export function createImportCsvDescriptionProps() {
  return {
    title: "Import Search Cache",
    text: [
      "1. Open the Apple Passwords app.",
      "2. Choose File > Export All Passwords to File.",
      "3. Select that CSV here to import it into the password cache.",
      "",
      "This only imports website, username, and OTP metadata. Password values are ignored and are not written to the password cache.",
    ].join("\n"),
  };
}

export function createImportCsvPickerProps(defaultValue?: string) {
  return {
    id: "filePath",
    title: "CSV File",
    defaultValue: defaultValue ? [defaultValue] : undefined,
    allowMultipleSelection: false,
    canChooseFiles: true,
    canChooseDirectories: false,
    autoFocus: true,
  };
}

export function createImportCsvSubmitActionProps(onSubmit: (filePath: string) => Promise<void>) {
  return {
    title: "Continue",
    onSubmit: async (values: { filePath?: string[] }) => {
      await onSubmit(values.filePath?.[0]?.trim() ?? "");
    },
  };
}

function ImportCsvForm({ onSubmit }: { onSubmit: (filePath: string) => Promise<void> }) {
  const ui = getUiRuntime();
  const h = React.createElement;

  return h(
    ui.Form,
    {
      actions: h(ui.ActionPanel, null, h(ui.Action.SubmitForm, createImportCsvSubmitActionProps(onSubmit))),
    },
    h(ui.Form.Description, createImportCsvDescriptionProps()),
    h(ui.Form.FilePicker, createImportCsvPickerProps()),
  );
}

function createImportCsvAction(onSubmit: (filePath: string) => Promise<void>) {
  const ui = getUiRuntime();
  const h = React.createElement;

  return h(ui.Action.Push, {
    title: "Import CSV Cache",
    icon: ui.Icon.Download,
    target: h(ImportCsvForm, { onSubmit }),
  });
}

function createRetrySearchAction(onAction: () => Promise<void>) {
  const ui = getUiRuntime();
  const h = React.createElement;

  return h(ui.Action, {
    title: "Retry Search",
    icon: ui.Icon.ArrowClockwise,
    onAction: () => void onAction(),
  });
}

export default function Command() {
  const [workflow, setWorkflow] = useState<PasswordSearchWorkflow | null>(null);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AccountRecord[]>([]);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const [missingBinary, setMissingBinary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let activeRepository: AccountRepository | null = null;

    void createAccountRepository()
      .then((created) => {
        if (cancelled) {
          void created.close();
          return;
        }

        activeRepository = created;
        return defaultApplePwClient.getStatus().then((statusOutcome) => {
          if (cancelled) {
            void created.close();
            return;
          }

          if (statusOutcome.kind === "success" && statusOutcome.payload.status !== "ready") {
            setAuthPrompt("Apple Passwords needs authentication before searching.");
          }

          setWorkflow(
            createPasswordSearchWorkflow({
              applePw: defaultApplePwClient,
              repository: created,
            }),
          );
          setIsLoading(false);
        });
      })
      .catch(async (error) => {
        if (isMissingApplePwBinaryError(error)) {
          setMissingBinary(true);
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
        await presentError(error);
      });

    return () => {
      cancelled = true;
      if (activeRepository) {
        void activeRepository.close();
      }
    };
  }, []);

  const runSearch = async (rawQuery: string) => {
    if (!workflow) {
      return;
    }

    const trimmedQuery = rawQuery.trim();
    if (!trimmedQuery) {
      requestIdRef.current += 1;
      setRows([]);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setRows([]);
    setAuthPrompt(null);
    setIsLoading(true);

    await workflow
      .search(trimmedQuery)
      .then((outcome) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (outcome.kind === "results") {
          setRows(outcome.rows);
          setAuthPrompt(null);
        } else if (outcome.kind === "auth-required") {
          setAuthPrompt(outcome.prompt);
        }
      })
      .catch(async (error) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        if (isMissingApplePwBinaryError(error)) {
          setMissingBinary(true);
          setIsLoading(false);
          return;
        }
        await presentError(error);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });
  };

  useEffect(() => {
    if (!workflow) {
      return;
    }

    void runSearch(query);
  }, [query, workflow]);

  const handlePassword = async (account: AccountRecord) => {
    if (!workflow) {
      return;
    }

    setIsLoading(true);
    try {
      const outcome = await workflow.fetchPassword(account);
      if (outcome.kind === "auth-required") {
        setAuthPrompt(outcome.prompt);
        return;
      }
      if (outcome.kind !== "secret") {
        return;
      }

      setAuthPrompt(null);
      await copySecretAndNotify(outcome);
    } catch (error) {
      if (isMissingApplePwBinaryError(error)) {
        setMissingBinary(true);
        return;
      }
      await presentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtp = async (account: AccountRecord) => {
    if (!workflow) {
      return;
    }

    setIsLoading(true);
    try {
      const outcome = await workflow.fetchOtp(account);
      if (outcome.kind === "auth-required") {
        setAuthPrompt(outcome.prompt);
        return;
      }
      if (outcome.kind !== "secret") {
        return;
      }

      setAuthPrompt(null);
      await copySecretAndNotify(outcome);
    } catch (error) {
      if (isMissingApplePwBinaryError(error)) {
        setMissingBinary(true);
        return;
      }
      await presentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!workflow) {
      return;
    }

    setIsLoading(true);
    try {
      const outcome = await workflow.submitPin(pin);
      if (outcome.kind === "results") {
        setRows(outcome.rows);
        setAuthPrompt(null);
      } else if (outcome.kind === "secret") {
        setAuthPrompt(null);
        await copySecretAndNotify(outcome);
      } else {
        setAuthPrompt(outcome.prompt);
      }
    } catch (error) {
      if (isMissingApplePwBinaryError(error)) {
        setMissingBinary(true);
        return;
      }
      await presentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvImport = async (filePath: string) => {
    if (!workflow) {
      return;
    }

    const trimmedPath = filePath.trim();
    if (!trimmedPath) {
      await presentError(new Error("Enter a CSV file path"));
      return;
    }

    setIsLoading(true);
    try {
      const accounts = await loadPasswordsCsv(trimmedPath);
      const outcome = await workflow.importAccounts(accounts, query);
      setRows(outcome.rows);
      setAuthPrompt(null);
      await getUiRuntime().popToRoot();
      await getUiRuntime().showHUD(`Imported ${accounts.length} cached accounts`);
    } catch (error) {
      await presentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrySearch = async () => {
    await runSearch(query);
  };

  if (missingBinary) {
    return React.createElement(MissingBinaryView);
  }

  if (authPrompt) {
    return React.createElement(AuthPromptForm, { prompt: authPrompt, onSubmit: handlePinSubmit });
  }

  const ui = getUiRuntime();
  const h = React.createElement;
  const trimmedQuery = query.trim();
  const emptyState = isLoading
    ? {
        icon: ui.Icon.Key,
        title: "Searching Apple Passwords",
        description: `Looking up ${trimmedQuery}...`,
      }
    : trimmedQuery
      ? {
          icon: ui.Icon.Key,
          title: "No matches found",
          description: `No passwords were found for ${trimmedQuery}. For improved search experience, import your password domains from an Apple Passwords CSV.`,
        }
      : {
          icon: ui.Icon.Key,
          title: "Search your passwords",
          description: "Type a domain or email fragment to sync from Apple Passwords.",
        };
  return h(
    ui.List,
    {
      isLoading,
      searchBarPlaceholder: "Search by domain or email",
      onSearchTextChange: setQuery,
    },
    rows.length === 0
      ? h(ui.List.EmptyView, {
          ...emptyState,
          actions: h(
            ui.ActionPanel,
            null,
            trimmedQuery ? createRetrySearchAction(handleRetrySearch) : null,
            createImportCsvAction(handleCsvImport),
          ),
        })
      : rows.map((account) =>
          h(SecretActionListItem, {
            key: `${account.domain}:${account.username}`,
            account,
            onPassword: handlePassword,
            onOtp: handleOtp,
            onImportCsv: handleCsvImport,
          }),
        ),
  );
}
