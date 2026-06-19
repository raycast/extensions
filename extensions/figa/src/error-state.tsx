// fallow-ignore-next-line unresolved-import
import { Action, ActionPanel, Color, Detail, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { toFriendlyError } from "./api/client";
import { FIGA_DEVELOPER_API_DOCS_URL, getFigaApiKeySettingsUrl, getFigaBillingUrl } from "./api/links";
import type { FigaFriendlyError } from "./api/types";

const ERROR_COLOR_BY_KIND: Partial<Record<FigaFriendlyError["kind"], Color>> = {
  "rate-limited": Color.Yellow,
  "paid-plan-required": Color.Orange,
  "network-failure": Color.Orange,
};

export function FigaCommandErrorDetail({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const friendlyError = toFriendlyError(error);

  return (
    <Detail
      markdown={buildErrorMarkdown(friendlyError)}
      metadata={<ErrorMetadata error={friendlyError} />}
      actions={<ErrorActions error={friendlyError} onRetry={onRetry} />}
    />
  );
}

function ErrorActions({ error, onRetry }: { error: FigaFriendlyError; onRetry: () => void }) {
  return (
    <ActionPanel>
      <Action title="Retry" icon={Icon.ArrowClockwise} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={onRetry} />
      <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
      {shouldShowApiKeySettings(error) ? (
        <Action.OpenInBrowser
          title="Open API Key Settings"
          icon={Icon.Key}
          url={getFigaApiKeySettingsUrl()}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      ) : null}
      {error.kind === "paid-plan-required" ? (
        <Action.OpenInBrowser title="Open Billing Settings" icon={Icon.CreditCard} url={getFigaBillingUrl()} />
      ) : null}
      <Action.OpenInBrowser title="Open Developer API Docs" icon={Icon.Book} url={FIGA_DEVELOPER_API_DOCS_URL} />
    </ActionPanel>
  );
}

function ErrorMetadata({ error }: { error: FigaFriendlyError }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="State">
        <Detail.Metadata.TagList.Item text={formatErrorKind(error)} color={getErrorColor(error)} />
      </Detail.Metadata.TagList>
      {error.status !== undefined && error.status !== null ? (
        <Detail.Metadata.Label title="HTTP Status" text={String(error.status)} />
      ) : null}
      {error.code ? <Detail.Metadata.Label title="Figa Error Code" text={error.code} /> : null}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link title="Developer API Docs" text="Open docs" target={FIGA_DEVELOPER_API_DOCS_URL} />
    </Detail.Metadata>
  );
}

function buildErrorMarkdown(error: FigaFriendlyError): string {
  return [
    `# ${error.title}`,
    "",
    error.message,
    "",
    error.action ? `**Next step:** ${error.action}` : null,
    error.kind === "paid-plan-required"
      ? "API keys are checked against the current workspace plan at request time. A key created on Pro stops working after a downgrade to Free."
      : null,
    error.kind === "missing-api-key"
      ? "Raycast stores the key in extension preferences as a password value. The raw key is never shown in this command."
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function shouldShowApiKeySettings(error: FigaFriendlyError): boolean {
  return [
    "invalid-api-key",
    "paid-plan-required",
    "insufficient-permissions",
    "forbidden",
    "validation-error",
  ].includes(error.kind);
}

function formatErrorKind(error: FigaFriendlyError): string {
  return error.kind
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getErrorColor(error: FigaFriendlyError): Color {
  return ERROR_COLOR_BY_KIND[error.kind] ?? Color.Red;
}
