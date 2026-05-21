// fallow-ignore-next-line unresolved-import
import { Action, ActionPanel, Color, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getWorkspaceContext, toFriendlyError } from "./api/client";
import {
  FIGA_DEVELOPER_API_DOCS_URL,
  getFigaApiKeySettingsUrl,
  getFigaBillingUrl,
  getFigaWorkspaceSettingsUrl,
} from "./api/links";
import type { FigaFriendlyError, FigaPlanTier, FigaWorkspaceContext } from "./api/types";

export default function Command() {
  const { data, error, isLoading, revalidate } = usePromise(getWorkspaceContext);

  if (error) {
    return <WorkspaceContextError error={error} onRetry={revalidate} />;
  }

  return <WorkspaceContextDetail context={data} isLoading={isLoading} onRefresh={revalidate} />;
}

function WorkspaceContextError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const friendlyError = toFriendlyError(error);

  return (
    <Detail
      markdown={buildErrorMarkdown(friendlyError)}
      metadata={<ErrorMetadata error={friendlyError} />}
      actions={<ErrorActions error={friendlyError} onRetry={onRetry} />}
    />
  );
}

function WorkspaceContextDetail({
  context,
  isLoading,
  onRefresh,
}: {
  context?: FigaWorkspaceContext;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  if (!context) {
    return <Detail isLoading={isLoading} markdown="# Loading Figa workspace context" />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildSuccessMarkdown(context)}
      metadata={<WorkspaceMetadata context={context} />}
      actions={<WorkspaceActions context={context} onRefresh={onRefresh} />}
    />
  );
}

function WorkspaceActions({
  context,
  onRefresh,
}: {
  context: FigaWorkspaceContext;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
      <Action.CopyToClipboard
        title="Copy Workspace ID"
        icon={Icon.CopyClipboard}
        content={context.workspace.id}
      />
      <Action.OpenInBrowser
        title="Open API Key Settings"
        icon={Icon.Key}
        url={getFigaApiKeySettingsUrl(context.workspace.id)}
      />
      <Action.OpenInBrowser
        title="Open Workspace Settings"
        icon={Icon.Gear}
        url={getFigaWorkspaceSettingsUrl(context.workspace.id)}
      />
      <Action.OpenInBrowser
        title="Open Developer API Docs"
        icon={Icon.Book}
        url={FIGA_DEVELOPER_API_DOCS_URL}
      />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Cog}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

function ErrorActions({ error, onRetry }: { error: FigaFriendlyError; onRetry: () => void }) {
  return (
    <ActionPanel>
      <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Cog}
        onAction={openExtensionPreferences}
      />
      {shouldShowApiKeySettings(error) ? (
        <Action.OpenInBrowser
          title="Open API Key Settings"
          icon={Icon.Key}
          url={getFigaApiKeySettingsUrl()}
        />
      ) : null}
      {error.kind === "paid-plan-required" ? (
        <Action.OpenInBrowser
          title="Open Billing Settings"
          icon={Icon.CreditCard}
          url={getFigaBillingUrl()}
        />
      ) : null}
      <Action.OpenInBrowser
        title="Open Developer API Docs"
        icon={Icon.Book}
        url={FIGA_DEVELOPER_API_DOCS_URL}
      />
    </ActionPanel>
  );
}

function WorkspaceMetadata({ context }: { context: FigaWorkspaceContext }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Connection">
        <Detail.Metadata.TagList.Item text="Connected" color={Color.Green} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Workspace" icon={Icon.Building} text={context.workspace.name} />
      <Detail.Metadata.Label title="Workspace ID" text={context.workspace.id} />
      <Detail.Metadata.Label
        title="Base Currency"
        icon={Icon.Coins}
        text={context.workspace.baseCurrency}
      />
      <Detail.Metadata.TagList title="Plan">
        <Detail.Metadata.TagList.Item
          text={formatPlanTier(context.plan.tier)}
          color={getPlanColor(context.plan.tier)}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Schema Version" text={String(context.schemaVersion)} />
      <Detail.Metadata.Label
        title="Generated"
        icon={Icon.Clock}
        text={formatUnixTime(context.generatedAt)}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link
        title="API Key Settings"
        text="Open in Figa"
        target={getFigaApiKeySettingsUrl(context.workspace.id)}
      />
      <Detail.Metadata.Link
        title="Developer API Docs"
        text="Open docs"
        target={FIGA_DEVELOPER_API_DOCS_URL}
      />
    </Detail.Metadata>
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
      <Detail.Metadata.Link
        title="Developer API Docs"
        text="Open docs"
        target={FIGA_DEVELOPER_API_DOCS_URL}
      />
    </Detail.Metadata>
  );
}

function buildSuccessMarkdown(context: FigaWorkspaceContext): string {
  const limits = context.plan.criticalLimits;

  return [
    `# ${escapeMarkdown(context.workspace.name)}`,
    "",
    "Figa connection is active for this workspace.",
    "",
    "## Critical Limits",
    "",
    "| Limit | Value |",
    "| --- | --- |",
    `| API keys per workspace | ${formatLimit(limits.apiKeysPerWorkspace)} |`,
    `| Monthly expenses | ${formatLimit(limits.maxExpensesPerMonth)} |`,
    `| Monthly AI chat requests | ${formatLimit(limits.maxAiChatRequests)} |`,
    `| Monthly AI vision requests | ${formatLimit(limits.maxAiVisionRequests)} |`,
    "",
    "## API Contract",
    "",
    "- `GET /api/v1/context`",
    "- Permission: `workspaces.read`",
  ].join("\n");
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

function formatLimit(value: number | null): string {
  return value === null ? "Unlimited" : String(value);
}

function formatPlanTier(tier: FigaPlanTier): string {
  if (tier === "pro") return "Pro";
  if (tier === "enterprise") return "Enterprise";
  return "Free";
}

function getPlanColor(tier: FigaPlanTier): Color {
  if (tier === "enterprise") return Color.Purple;
  if (tier === "pro") return Color.Green;
  return Color.Yellow;
}

function formatUnixTime(value: number): string {
  return new Date(value * 1000).toLocaleString();
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
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getErrorColor(error: FigaFriendlyError): Color {
  if (error.kind === "rate-limited") return Color.Yellow;
  if (error.kind === "network-failure" || error.kind === "invalid-base-url") return Color.Orange;
  return Color.Red;
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1");
}
