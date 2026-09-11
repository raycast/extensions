// fallow-ignore-next-line unresolved-import
import { Action, ActionPanel, Color, Detail, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getWorkspaceContext } from "./api/client";
import { FIGA_DEVELOPER_API_DOCS_URL, getFigaApiKeySettingsUrl, getFigaWorkspaceSettingsUrl } from "./api/links";
import type { FigaPlanTier, FigaWorkspaceContext, FigaWorkspaceContextCapabilities } from "./api/types";
import { FigaCommandErrorDetail } from "./error-state";
import { escapeMarkdown } from "./format";

export default function Command() {
  const { data, error, isLoading, revalidate } = usePromise(getWorkspaceContext);

  if (error) {
    return <WorkspaceContextError error={error} onRetry={revalidate} />;
  }

  return <WorkspaceContextDetail context={data} isLoading={isLoading} onRefresh={revalidate} />;
}

function WorkspaceContextError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <FigaCommandErrorDetail error={error} onRetry={onRetry} />;
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

function WorkspaceActions({ context, onRefresh }: { context: FigaWorkspaceContext; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <Action.CopyToClipboard
        title="Copy Workspace ID"
        icon={Icon.CopyClipboard}
        content={context.workspace.id}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.OpenInBrowser
        title="Open API Key Settings"
        icon={Icon.Key}
        url={getFigaApiKeySettingsUrl(context.workspace.id)}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action.OpenInBrowser
        title="Open Workspace Settings"
        icon={Icon.Gear}
        url={getFigaWorkspaceSettingsUrl(context.workspace.id)}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
      <Action.OpenInBrowser title="Open Developer API Docs" icon={Icon.Book} url={FIGA_DEVELOPER_API_DOCS_URL} />
      <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
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
      <Detail.Metadata.Label title="Base Currency" icon={Icon.Coins} text={context.workspace.baseCurrency} />
      <Detail.Metadata.Label title="Default Currency" icon={Icon.Coins} text={getDefaultBaseCurrency(context)} />
      <Detail.Metadata.TagList title="Plan">
        <Detail.Metadata.TagList.Item
          text={formatPlanTier(context.plan.tier)}
          color={getPlanColor(context.plan.tier)}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Schema Version" text={String(context.schemaVersion)} />
      <Detail.Metadata.Label title="Generated" icon={Icon.Clock} text={formatUnixTime(context.generatedAt)} />
      {context.schemaVersion === 2 ? <CapabilityMetadata capabilities={context.capabilities} /> : null}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link
        title="API Key Settings"
        text="Open in Figa"
        target={getFigaApiKeySettingsUrl(context.workspace.id)}
      />
      <Detail.Metadata.Link title="Developer API Docs" text="Open docs" target={FIGA_DEVELOPER_API_DOCS_URL} />
    </Detail.Metadata>
  );
}

function CapabilityMetadata({ capabilities }: { capabilities: FigaWorkspaceContextCapabilities }) {
  return (
    <>
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Expenses">
        <Detail.Metadata.TagList.Item text="Read" color={getCapabilityColor(capabilities.expenses.read)} />
        <Detail.Metadata.TagList.Item text="Write" color={getCapabilityColor(capabilities.expenses.write)} />
        <Detail.Metadata.TagList.Item text="Delete" color={getCapabilityColor(capabilities.expenses.delete)} />
        <Detail.Metadata.TagList.Item text="Payments" color={getCapabilityColor(capabilities.expenses.payments)} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.TagList title="Categories">
        <Detail.Metadata.TagList.Item text="Read" color={getCapabilityColor(capabilities.categories.read)} />
        <Detail.Metadata.TagList.Item text="Write" color={getCapabilityColor(capabilities.categories.write)} />
        <Detail.Metadata.TagList.Item text="Delete" color={getCapabilityColor(capabilities.categories.delete)} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.TagList title="Recipients">
        <Detail.Metadata.TagList.Item text="Read" color={getCapabilityColor(capabilities.recipients.read)} />
        <Detail.Metadata.TagList.Item text="Write" color={getCapabilityColor(capabilities.recipients.write)} />
        <Detail.Metadata.TagList.Item text="Delete" color={getCapabilityColor(capabilities.recipients.delete)} />
      </Detail.Metadata.TagList>
    </>
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
    "## Defaults",
    "",
    "| Default | Value |",
    "| --- | --- |",
    `| Base currency | ${getDefaultBaseCurrency(context)} |`,
    "",
    buildCapabilitiesMarkdown(context),
  ].join("\n");
}

function buildCapabilitiesMarkdown(context: FigaWorkspaceContext): string {
  if (context.schemaVersion !== 2) {
    return ["## Capabilities", "", "Capability discovery is not available from this API response."].join("\n");
  }

  const capabilities = context.capabilities;

  return [
    "## Capabilities",
    "",
    "| Capability | State |",
    "| --- | --- |",
    `| expenses.read | ${formatCapability(capabilities.expenses.read)} |`,
    `| expenses.write | ${formatCapability(capabilities.expenses.write)} |`,
    `| expenses.delete | ${formatCapability(capabilities.expenses.delete)} |`,
    `| expenses.payments | ${formatCapability(capabilities.expenses.payments)} |`,
    `| categories.read | ${formatCapability(capabilities.categories.read)} |`,
    `| categories.write | ${formatCapability(capabilities.categories.write)} |`,
    `| categories.delete | ${formatCapability(capabilities.categories.delete)} |`,
    `| recipients.read | ${formatCapability(capabilities.recipients.read)} |`,
    `| recipients.write | ${formatCapability(capabilities.recipients.write)} |`,
    `| recipients.delete | ${formatCapability(capabilities.recipients.delete)} |`,
    `| workspaces.read | ${formatCapability(capabilities.workspaces.read)} |`,
  ].join("\n");
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

function getCapabilityColor(value: boolean): Color {
  return value ? Color.Green : Color.SecondaryText;
}

function getDefaultBaseCurrency(context: FigaWorkspaceContext): string {
  return context.schemaVersion === 2 ? context.defaults.baseCurrency : context.workspace.baseCurrency;
}

function formatCapability(value: boolean): string {
  return value ? "Available" : "Unavailable";
}

function formatUnixTime(value: number): string {
  return new Date(value * 1000).toLocaleString();
}
