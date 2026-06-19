// fallow-ignore-next-line unresolved-import
import { Action, ActionPanel, Color, Detail, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import type { ReactNode } from "react";
import { getFigaApiKeySettingsUrl } from "./api/links";
import type { FigaWorkspaceContext } from "./api/types";
import {
  canReadResource,
  canWriteExpenses,
  escapeMarkdown,
  formatReadCapability,
  type ReadCapabilityResource,
} from "./format";
import { FigaCommandErrorDetail } from "./error-state";

export function ReadCapabilityGate({
  context,
  error,
  onRetry,
  resource,
  children,
}: {
  context?: FigaWorkspaceContext;
  error?: unknown;
  onRetry: () => void;
  resource: ReadCapabilityResource;
  children: ReactNode;
}) {
  if (error) return <FigaCommandErrorDetail error={error} onRetry={onRetry} />;
  if (context && !canReadResource(context, resource)) {
    return <ReadCapabilityPermissionDetail context={context} resource={resource} onRetry={onRetry} />;
  }

  return <>{children}</>;
}

export function ReadCapabilityPermissionDetail({
  context,
  resource,
  onRetry,
}: {
  context: FigaWorkspaceContext;
  resource: ReadCapabilityResource;
  onRetry: () => void;
}) {
  const capability = formatReadCapability(resource);
  const label = getResourceLabel(resource);

  return (
    <CapabilityPermissionDetail
      context={context}
      title={`${label} Read Permission Required`}
      capability={capability}
      nextStep="Create or select a read API key for this workspace."
      onRetry={onRetry}
    />
  );
}

export function ExpenseWriteGate({
  context,
  error,
  onRetry,
  children,
}: {
  context?: FigaWorkspaceContext;
  error?: unknown;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (error) return <FigaCommandErrorDetail error={error} onRetry={onRetry} />;
  if (context && !canWriteExpenses(context)) {
    return <ExpenseWritePermissionDetail context={context} onRetry={onRetry} />;
  }

  return <>{children}</>;
}

export function ExpenseWritePermissionDetail({
  context,
  onRetry,
}: {
  context: FigaWorkspaceContext;
  onRetry: () => void;
}) {
  return (
    <CapabilityPermissionDetail
      context={context}
      title="Expense Write Permission Required"
      capability="expenses.write"
      nextStep="Create or select a write API key for this workspace."
      onRetry={onRetry}
    />
  );
}

export function ExpensePaymentPermissionDetail({
  context,
  onRetry,
}: {
  context: FigaWorkspaceContext;
  onRetry: () => void;
}) {
  return (
    <CapabilityPermissionDetail
      context={context}
      title="Expense Payment Permission Required"
      capability="expenses.payments"
      nextStep="Create or select a write API key for this workspace."
      onRetry={onRetry}
    />
  );
}

function CapabilityPermissionDetail({
  context,
  title,
  capability,
  nextStep,
  onRetry,
}: {
  context: FigaWorkspaceContext;
  title: string;
  capability: string;
  nextStep: string;
  onRetry: () => void;
}) {
  return (
    <Detail
      markdown={[
        `# ${title}`,
        "",
        `The configured key can read workspace context for ${escapeMarkdown(
          context.workspace.name,
        )}, but it does not include \`${capability}\`.`,
        "",
        `**Next step:** ${nextStep}`,
      ].join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Workspace" icon={Icon.Building} text={context.workspace.name} />
          <Detail.Metadata.Label title="Workspace ID" text={context.workspace.id} />
          <Detail.Metadata.TagList title="Required Capability">
            <Detail.Metadata.TagList.Item text={capability} color={Color.Red} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Link
            title="API Key Settings"
            text="Open in Figa"
            target={getFigaApiKeySettingsUrl(context.workspace.id)}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Retry"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRetry}
          />
          <Action.OpenInBrowser
            title="Open API Key Settings"
            icon={Icon.Key}
            url={getFigaApiKeySettingsUrl(context.workspace.id)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function getResourceLabel(resource: ReadCapabilityResource): string {
  if (resource === "categories") return "Category";
  if (resource === "recipients") return "Recipient";
  return "Expense";
}
