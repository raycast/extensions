import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import {
  adminUrl,
  authorityUrl,
  azureCliSnippet,
  azurePowerShellSnippet,
  entraUrl,
  graphPowerShellSnippet,
  jsonSnippet,
  openIdConfigUrl,
  portalUrl,
  toCsv,
  tenantIdList,
  type TenantResult,
} from "../lib/tenant";

const CLOUD_COLORS: Record<string, Color> = {
  Commercial: Color.Blue,
  "US Gov (GCC High / DoD)": Color.Green,
  "China (21Vianet)": Color.Red,
};

const copyBulk: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "c" },
  Windows: { modifiers: ["ctrl", "shift"], key: "c" },
};

const searchShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "f" },
  Windows: { modifiers: ["ctrl"], key: "f" },
};

const removeShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["ctrl"], key: "x" },
  Windows: { modifiers: ["ctrl"], key: "x" },
};

export interface TenantListItemProps {
  result: TenantResult;
  /** All results currently shown, used for the "Copy All" bulk actions. */
  allResults?: TenantResult[];
  /** Re-run the search for this domain (used from the history view). */
  onSearch?: (domain: string) => void;
  /** Remove this entry from history (only present in the history view). */
  onRemove?: (domain: string) => void;
  /** Clear the whole history (only present in the history view). */
  onClear?: () => void;
}

export function TenantListItem(props: TenantListItemProps) {
  const { result } = props;

  if (result.isConsumer && result.tenantId) {
    const tenantId = result.tenantId;
    const authority = `https://login.microsoftonline.com/${tenantId}`;
    const openIdUrl = `${authority}/v2.0/.well-known/openid-configuration`;
    const domains = result.relatedDomains ?? [];
    return (
      <List.Item
        icon={{ source: Icon.PersonCircle, tintColor: Color.Purple }}
        title={tenantId}
        subtitle={result.brandName}
        keywords={["personal", "consumer", "microsoft account", "windows live", ...domains]}
        accessories={[
          ...(domains.length > 0 ? [{ text: domains[0] }] : []),
          { tag: { value: "Personal account", color: Color.Purple }, icon: Icon.Person },
        ]}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Tenant ID" text={tenantId} icon={Icon.Fingerprint} />
                <List.Item.Detail.Metadata.Label
                  title="Type"
                  text={result.brandName ?? "Personal Microsoft account"}
                  icon={Icon.Person}
                />
                {domains.length > 0 ? (
                  <List.Item.Detail.Metadata.TagList title="Example Domains">
                    {domains.map((domain) => (
                      <List.Item.Detail.Metadata.TagList.Item key={domain} text={domain} color={Color.Purple} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                {result.note ? <List.Item.Detail.Metadata.Label title="About" text={result.note} /> : null}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Link title="Login Authority" text={authority} target={authority} />
                <List.Item.Detail.Metadata.Link title="OpenID Configuration" text="Open JSON" target={openIdUrl} />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Tenant ID" content={tenantId} icon={Icon.Clipboard} />
            <Action.Paste title="Paste Tenant ID" content={tenantId} />
            <Action.CopyToClipboard title="Copy Login Authority URL" content={authority} />
            <Action.OpenInBrowser title="Open OpenID Configuration" url={openIdUrl} />
          </ActionPanel>
        }
      />
    );
  }

  if (!result.tenantId) {
    return (
      <List.Item
        icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        title={result.domain || result.input}
        subtitle={result.error ?? "No Microsoft tenant found"}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Domain" content={result.domain || result.input} />
            {props.onSearch ? (
              <Action
                title="Search This Domain"
                icon={Icon.MagnifyingGlass}
                shortcut={searchShortcut}
                onAction={() => props.onSearch?.(result.domain)}
              />
            ) : null}
            {props.onRemove ? (
              <Action
                title="Remove from History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={removeShortcut}
                onAction={() => props.onRemove?.(result.domain)}
              />
            ) : null}
          </ActionPanel>
        }
      />
    );
  }

  const tenantId = result.tenantId;
  const isFederated = result.namespaceType === "Federated";

  const accessories: List.Item.Accessory[] = [];
  if (result.brandName) accessories.push({ tag: result.brandName, icon: Icon.Building });
  if (result.namespaceType) {
    accessories.push({
      tag: {
        value: result.namespaceType,
        color: isFederated ? Color.Orange : Color.Green,
      },
    });
  }
  if (result.cloudLabel && result.cloud !== "commercial") {
    accessories.push({ tag: { value: result.cloudLabel, color: Color.Purple } });
  }

  return (
    <List.Item
      icon={{ source: Icon.Building, tintColor: Color.Blue }}
      title={tenantId}
      subtitle={result.domain}
      keywords={[result.domain, result.brandName ?? ""].filter(Boolean)}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Domain" text={result.domain} icon={Icon.Globe} />
              <List.Item.Detail.Metadata.Label title="Tenant ID" text={tenantId} icon={Icon.Fingerprint} />
              {result.brandName ? (
                <List.Item.Detail.Metadata.Label title="Organization" text={result.brandName} icon={Icon.Building} />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Cloud">
                <List.Item.Detail.Metadata.TagList.Item
                  text={result.cloudLabel ?? "Commercial"}
                  color={CLOUD_COLORS[result.cloudLabel ?? "Commercial"] ?? Color.Blue}
                />
              </List.Item.Detail.Metadata.TagList>
              {result.namespaceType ? (
                <List.Item.Detail.Metadata.TagList title="Auth Type">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={result.namespaceType}
                    color={isFederated ? Color.Orange : Color.Green}
                  />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {result.regionScope ? (
                <List.Item.Detail.Metadata.Label title="Region Scope" text={result.regionScope} />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link
                title="Login Authority"
                text={authorityUrl(result)}
                target={authorityUrl(result)}
              />
              <List.Item.Detail.Metadata.Link
                title="OpenID Configuration"
                text="Open JSON"
                target={openIdConfigUrl(result)}
              />
              {isFederated && result.federationUrl ? (
                <List.Item.Detail.Metadata.Link
                  title="Federation (ADFS)"
                  text="Sign-in endpoint"
                  target={result.federationUrl}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Tenant ID" content={tenantId} icon={Icon.Clipboard} />
            <Action.Paste title="Paste Tenant ID" content={tenantId} />
            <ActionPanel.Submenu title="Copy as…" icon={Icon.Clipboard}>
              <Action.CopyToClipboard title="Login Authority URL" content={authorityUrl(result)} />
              <Action.CopyToClipboard title="Azure CLI Command" content={azureCliSnippet(result)} />
              <Action.CopyToClipboard title="Azure PowerShell Command" content={azurePowerShellSnippet(result)} />
              <Action.CopyToClipboard
                title="Microsoft Graph PowerShell Command"
                content={graphPowerShellSnippet(result)}
              />
              <Action.CopyToClipboard title="JSON" content={jsonSnippet(result)} />
              <Action.CopyToClipboard title="Domain" content={result.domain} />
            </ActionPanel.Submenu>
          </ActionPanel.Section>

          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Microsoft Entra Admin Center"
              url={entraUrl(result)}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.OpenInBrowser title="Azure Portal (Directory)" url={portalUrl(result)} />
            <Action.OpenInBrowser title="Microsoft 365 Admin Center" url={adminUrl(result)} />
            <Action.OpenInBrowser title="OpenID Configuration" url={openIdConfigUrl(result)} />
            {isFederated && result.federationUrl ? (
              <Action.OpenInBrowser title="Federation Sign-In URL" url={result.federationUrl} />
            ) : null}
          </ActionPanel.Section>

          {props.allResults && props.allResults.filter((r) => r.tenantId).length > 1 ? (
            <ActionPanel.Section title="All Results">
              <Action.CopyToClipboard
                title="Copy All as CSV"
                content={toCsv(props.allResults)}
                icon={Icon.Document}
                shortcut={copyBulk}
              />
              <Action.CopyToClipboard
                title="Copy All Tenant IDs"
                content={tenantIdList(props.allResults)}
                icon={Icon.List}
              />
            </ActionPanel.Section>
          ) : null}

          {props.onSearch || props.onRemove || props.onClear ? (
            <ActionPanel.Section title="History">
              {props.onSearch ? (
                <Action
                  title="Search This Domain"
                  icon={Icon.MagnifyingGlass}
                  shortcut={searchShortcut}
                  onAction={() => props.onSearch?.(result.domain)}
                />
              ) : null}
              {props.onRemove ? (
                <Action
                  title="Remove from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={removeShortcut}
                  onAction={() => props.onRemove?.(result.domain)}
                />
              ) : null}
              {props.onClear ? (
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => props.onClear?.()}
                />
              ) : null}
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
