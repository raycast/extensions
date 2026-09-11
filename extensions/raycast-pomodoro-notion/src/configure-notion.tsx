import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SelectNotionDatabase } from "./components/select-notion-database";
import { getNotionAuthStatus, type NotionAuth } from "./lib/notion-auth";
import { authorizeNotion, disconnectNotionOAuth, getNotionOAuthAccessToken } from "./lib/notion-oauth/authorize";
import { isNotionOAuthConfigured } from "./lib/notion-oauth/constants";
import {
  getNotionOAuthDiagnostics,
  loadOAuthDatabaseSelection,
  saveOAuthDatabaseSelection,
  syncOAuthPreferencesFromPkce,
  testOAuthStorageWrite,
  type NotionOAuthDiagnostics,
} from "./lib/notion-oauth/storage";
import {
  REQUIRED_DATABASE_SCHEMA,
  REQUIRED_FOCUS_OPTIONS,
  validatePomodoroDatabase,
  type ValidationResult,
} from "./lib/notion";
import { getNotionSettings } from "./lib/preferences";

type ValidationState = {
  isLoading: boolean;
  result?: ValidationResult;
  error?: string;
};

function buildMarkdown(auth: NotionAuth | null, oauthConnected: boolean, state: ValidationState): string {
  const manual = getNotionSettings();
  const lines: string[] = ["# Notion Setup", "", "## Connection", ""];

  if (auth?.source === "manual") {
    lines.push("- Mode: Manual (Advanced preferences)");
    lines.push("- Database: configured in Extension Preferences");
  } else if (auth?.source === "oauth") {
    lines.push("- Mode: Notion OAuth");
    lines.push(`- Database: ${auth.databaseTitle ?? "Work log database"}`);
  } else if (oauthConnected) {
    lines.push("- Mode: OAuth signed in");
    lines.push("- Database: not selected yet");
    lines.push(
      "- Granting access on Notion's consent screen is not enough. Run **Choose Work Log Database**, pick your work log database, then **Use as Work Log Database**.",
    );
    lines.push("- After that, run **Validate Connection**.");
  } else if (manual.notionToken || manual.notionDatabaseId) {
    lines.push("- Mode: Manual (incomplete)");
    lines.push(`- Token: ${manual.notionToken ? "Configured" : "Not set"}`);
    lines.push(`- Database: ${manual.notionDatabaseId ? "Configured in Extension Preferences" : "Not set"}`);
    if (manual.notionToken && manual.notionDatabaseId) {
      lines.push("- OAuth can still be used once both Advanced fields are cleared.");
    }
  } else {
    lines.push("- Mode: Not connected");
    if (isNotionOAuthConfigured()) {
      lines.push("- Use **Connect Notion Account** to sign in and choose a work log database.");
    } else {
      lines.push(
        "- OAuth is not configured in this build. Use **Open Extension Preferences** for manual Connect setup.",
      );
    }
  }

  lines.push("", "## Required Properties", "");

  for (const [name, propertyType] of Object.entries(REQUIRED_DATABASE_SCHEMA)) {
    lines.push(`- \`${name}\`: \`${propertyType}\``);
  }

  lines.push("", "## Validation", "");

  if (state.isLoading) {
    lines.push("Validating...");
    return lines.join("\n");
  }

  if (state.error) {
    lines.push(`- Status: Failed`, `- Details: ${state.error}`);
    return lines.join("\n");
  }

  if (!state.result) {
    lines.push("Not validated yet. Run **Validate Connection** from the action panel.");
    return lines.join("\n");
  }

  lines.push(`- Status: ${state.result.ok ? "OK" : "Needs fixes"}`);
  if (state.result.databaseTitle) {
    lines.push(`- Database: ${state.result.databaseTitle}`);
  }

  if (state.result.missingProperties.length > 0) {
    lines.push("", "### Missing properties", "", ...state.result.missingProperties.map((name) => `- \`${name}\``));
  }

  if (state.result.invalidProperties.length > 0) {
    lines.push("", "### Type mismatches", "");
    for (const property of state.result.invalidProperties) {
      lines.push(`- \`${property.name}\`: expected \`${property.expected}\`, actual \`${property.actual}\``);
    }
  }

  if (state.result.focusOptions.length > 0) {
    lines.push("", "### Focus options", "", ...state.result.focusOptions.map((name) => `- ${name}`));
  }

  if (state.result.sessionTypeOptions.length > 0) {
    lines.push("", "### Session Type options", "", ...state.result.sessionTypeOptions.map((name) => `- ${name}`));
  }

  if (state.result.missingFocusOptions.length > 0) {
    lines.push(
      "",
      "### Focus warnings",
      "",
      `- Recommended options: ${REQUIRED_FOCUS_OPTIONS.join(", ")}`,
      `- Missing in Notion: ${state.result.missingFocusOptions.join(", ")}`,
      "",
      "The work log form defaults to `High` / `Medium` / `Low`.",
      "Connection can still succeed if required properties and types are correct.",
    );
  }

  if (state.result.missingSessionTypeOptions.length > 0) {
    lines.push(
      "",
      "### Session Type warnings",
      "",
      `- Configured in the extension but missing in Notion: ${state.result.missingSessionTypeOptions.join(", ")}`,
      "",
      "Session Type is saved as a Select property. Add matching options to Notion `Session Type`.",
    );
  }

  if (state.result.ok) {
    lines.push("", "This database can be reused on the next launch.");
  }

  return lines.join("\n");
}

function buildDiagnosticsMarkdown(diagnostics: NotionOAuthDiagnostics, lastOAuthError?: string): string {
  const lines = [
    "# Connection Diagnostics",
    "",
    `- PKCE token: ${diagnostics.hasPkceToken ? "saved" : "missing"}`,
    `- Local token backup: ${diagnostics.hasStoredToken ? "saved" : "missing"}`,
    `- Database preferences: ${diagnostics.hasDatabasePreferences ? "saved" : "missing"}`,
    `- Preferences file: \`${diagnostics.preferencesFile}\``,
    "",
    "Token comes from Raycast OAuth and is mirrored to LocalStorage + supportPath file.",
  ];

  if (lastOAuthError) {
    lines.push("", "## Last OAuth error", "", lastOAuthError);
    if (lastOAuthError.includes("invalid_grant") || lastOAuthError.includes("Token exchange failed")) {
      lines.push(
        "",
        "If this mentions `invalid_grant`, regenerate PKCE Proxy URLs at https://oauth.raycast.com/ with **JSON** encoding (not form), then rerun `python3 scripts/apply_notion_oauth_config.py`.",
      );
    }
  }

  return lines.join("\n");
}

export default function ConfigureNotionCommand() {
  const { push } = useNavigation();
  const [state, setState] = useState<ValidationState>({ isLoading: false });
  const [auth, setAuth] = useState<NotionAuth | null>(null);
  const [oauthConnected, setOauthConnected] = useState(false);
  const [lastOAuthError, setLastOAuthError] = useState<string | undefined>();
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const refreshAuth = useCallback(async () => {
    await syncOAuthPreferencesFromPkce();
    const status = await getNotionAuthStatus();
    setAuth(status.auth);
    setOauthConnected(status.oauthConnected);
    return status;
  }, []);

  const validateConnection = useCallback(
    async (activeAuth: NotionAuth | null) => {
      if (!activeAuth) {
        setState({
          isLoading: false,
          error: "Notion is not connected yet.",
        });
        return;
      }

      setState({ isLoading: true });

      try {
        const result = await validatePomodoroDatabase(activeAuth.token, activeAuth.databaseId);
        setState({
          isLoading: false,
          result,
        });

        await refreshAuth();

        await showToast({
          style: result.ok ? Toast.Style.Success : Toast.Style.Failure,
          title: result.ok
            ? result.missingFocusOptions.length > 0
              ? "Notion connection validated (warnings)"
              : "Notion connection validated"
            : "Notion setup needs fixes",
          message:
            result.ok && (result.missingFocusOptions.length > 0 || result.missingSessionTypeOptions.length > 0)
              ? [
                  result.missingFocusOptions.length > 0 ? `Focus: ${result.missingFocusOptions.join(", ")}` : null,
                  result.missingSessionTypeOptions.length > 0
                    ? `Session Type: ${result.missingSessionTypeOptions.join(", ")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" / ")
              : undefined,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        setState({
          isLoading: false,
          error: message,
        });

        await showToast({
          style: Toast.Style.Failure,
          title: "Notion validation failed",
          message,
        });
      }
    },
    [refreshAuth],
  );

  useEffect(() => {
    async function bootstrap() {
      const status = await refreshAuth();
      if (status.auth) {
        await validateConnection(status.auth);
      } else if (status.oauthConnected && !status.oauthDatabaseSelected) {
        const token = await getNotionOAuthAccessToken();
        if (token) {
          push(
            <SelectNotionDatabase
              token={token}
              onSelected={() => void refreshAuth().then((nextStatus) => validateConnection(nextStatus.auth))}
            />,
          );
        }
      }
      setIsBootstrapping(false);
    }

    void bootstrap();
  }, [push, refreshAuth, validateConnection]);

  const markdown = useMemo(() => buildMarkdown(auth, oauthConnected, state), [auth, oauthConnected, state]);

  async function handleShowDiagnostics() {
    const diagnostics = await getNotionOAuthDiagnostics();
    push(<Detail markdown={buildDiagnosticsMarkdown(diagnostics, lastOAuthError)} />);
  }

  async function handleTestStorage() {
    const result = await testOAuthStorageWrite();
    await refreshAuth();
    await showToast({
      style: result.ok ? Toast.Style.Success : Toast.Style.Failure,
      title: result.ok ? "Storage test passed" : "Storage test failed",
      message: result.message,
    });
  }

  async function handleConnectNotion() {
    setLastOAuthError(undefined);
    try {
      const token = await authorizeNotion();
      const status = await refreshAuth();
      if (!status.oauthConnected) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Notion token was not saved",
          message: "Connect again. If this repeats, use Advanced preferences with a manual token.",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Notion account connected",
        message: "Choose your work log database next.",
      });

      const manual = getNotionSettings();
      const existingOAuthDatabase = await loadOAuthDatabaseSelection();
      if (!existingOAuthDatabase && manual.notionDatabaseId) {
        try {
          const validation = await validatePomodoroDatabase(token, manual.notionDatabaseId);
          if (validation.ok) {
            await saveOAuthDatabaseSelection({
              databaseId: manual.notionDatabaseId,
              databaseTitle: validation.databaseTitle ?? "Work log database",
            });
            await refreshAuth().then((nextStatus) => validateConnection(nextStatus.auth));
            await showToast({
              style: Toast.Style.Success,
              title: "Reused Advanced Database ID",
              message: validation.databaseTitle ?? manual.notionDatabaseId,
            });
            return;
          }
        } catch {
          // Fall through to manual database selection.
        }
      }

      push(
        <SelectNotionDatabase
          token={token}
          onSelected={() => void refreshAuth().then((nextStatus) => validateConnection(nextStatus.auth))}
        />,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setLastOAuthError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Notion authorization failed",
        message: message.length > 120 ? `${message.slice(0, 120)}…` : message,
      });
    }
  }

  async function handleChooseDatabase() {
    const token = (await getNotionOAuthAccessToken()) ?? auth?.token;
    if (!token) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connect Notion first",
      });
      return;
    }

    push(
      <SelectNotionDatabase
        token={token}
        onSelected={() => void refreshAuth().then((nextStatus) => validateConnection(nextStatus.auth))}
      />,
    );
  }

  async function handleDisconnectOAuth() {
    await disconnectNotionOAuth();
    await refreshAuth();
    setState({ isLoading: false });
    await showToast({
      style: Toast.Style.Success,
      title: "Disconnected Notion OAuth",
    });
  }

  return (
    <Detail
      isLoading={isBootstrapping || state.isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {oauthConnected && !auth ? (
            <Action title="Choose Work Log Database" icon={Icon.List} onAction={handleChooseDatabase} />
          ) : null}
          {isNotionOAuthConfigured() ? (
            <Action title="Connect Notion Account" icon={Icon.Link} onAction={handleConnectNotion} />
          ) : null}
          <Action title="Test Storage Write" icon={Icon.Clipboard} onAction={handleTestStorage} />
          {oauthConnected && auth ? (
            <Action title="Choose Work Log Database" icon={Icon.List} onAction={handleChooseDatabase} />
          ) : null}
          {auth ? (
            <Action
              title="Validate Connection"
              icon={Icon.CheckCircle}
              onAction={() => void validateConnection(auth)}
            />
          ) : null}
          {oauthConnected && auth?.source === "oauth" ? (
            <Action
              title="Disconnect Notion OAuth"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDisconnectOAuth}
            />
          ) : null}
          <Action title="Show Connection Diagnostics" icon={Icon.Terminal} onAction={handleShowDiagnostics} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
