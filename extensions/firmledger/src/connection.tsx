import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ToolAction } from "./components/actions";
import { FooterActions } from "./components/Footer";
import { authMode, configuredEndpoint, oauthStatus, signIn, signOut } from "./lib/auth";
import { remoteTools, reportError } from "./lib/mcp";
import { LINKS, sectionLabel } from "./lib/theme";
import { TOOLS } from "./lib/tools";
import { getPreferenceValues } from "@raycast/api";

function CatalogCheck() {
  const { data, isLoading, error } = usePromise(remoteTools, [], { onError: reportError });
  let md = "# Live tool catalog\n\n";
  if (data) {
    const remote = new Set(data.map((t) => t.name));
    const local = new Set(TOOLS.map((t) => t.name));
    const missing = [...remote].filter((n) => !local.has(n));
    const gone = [...local].filter((n) => !remote.has(n));
    md += `Server reports **${remote.size}** tools. This extension implements **${local.size}**.\n\n`;
    md += missing.length ? `**New on server, not in this extension:** ${missing.join(", ")}\n\n` : "All server tools are covered.\n\n";
    if (gone.length) md += `**In this extension but not on the server:** ${gone.join(", ")}\n\n`;
    md +=
      "## Server tools\n" +
      [...remote]
        .sort()
        .map((n) => `- ${n}`)
        .join("\n");
  } else if (error) md += String(error);
  return <Detail isLoading={isLoading} markdown={md} />;
}

export default function Command() {
  const mode = authMode();
  const hasKey = Boolean(getPreferenceValues<{ apiKey?: string }>().apiKey?.trim());
  const { data: status, revalidate } = usePromise(oauthStatus, []);

  const doSignIn = async () => {
    const t = await showToast({ style: Toast.Style.Animated, title: "Opening FirmLedger sign-in…" });
    try {
      await signIn();
      t.style = Toast.Style.Success;
      t.title = "Signed in to FirmLedger";
      revalidate();
    } catch (e) {
      t.hide();
      await reportError(e);
    }
  };
  const doSignOut = async () => {
    await signOut();
    await showToast({
      style: Toast.Style.Success,
      title: "Signed out",
      message: "Access ended on FirmLedger's side and the token was removed.",
    });
    revalidate();
  };

  const authSub =
    mode === "oauth"
      ? status?.signedIn
        ? `Signed in${status.scope ? ` · ${status.scope}` : ""}`
        : "Not signed in"
      : hasKey
        ? "API key set (sent as Bearer token)"
        : "No API key (open directory tools only)";

  return (
    <List>
      <List.Section title={sectionLabel("Connection")}>
        <List.Item
          title="Method"
          subtitle={mode === "oauth" ? "Sign in with FirmLedger (OAuth)" : "API Key"}
          icon={Icon.Plug}
          actions={
            <ActionPanel>
              <Action title="Change Connection Method…" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <FooterActions />
            </ActionPanel>
          }
        />
        <List.Item title="Credentials" subtitle={authSub} icon={mode === "oauth" ? Icon.Person : Icon.Key} />
        <List.Item title="Endpoint" subtitle={configuredEndpoint()} icon={Icon.Globe} />
      </List.Section>
      {mode === "oauth" && (
        <List.Section title={sectionLabel("Sign-in")}>
          <List.Item
            title={status?.signedIn ? "Sign in again" : "Sign in with FirmLedger"}
            subtitle="Opens FirmLedger in your browser; no password or key passes through Raycast"
            icon={Icon.Person}
            actions={
              <ActionPanel>
                <Action title="Sign in" icon={Icon.Person} onAction={doSignIn} />
                <FooterActions />
              </ActionPanel>
            }
          />
          <List.Item
            title="Sign out"
            subtitle="Revokes the connection on FirmLedger and removes the token"
            icon={Icon.XMarkCircle}
            actions={
              <ActionPanel>
                <Action title="Sign out" icon={Icon.XMarkCircle} onAction={doSignOut} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title={sectionLabel("Checks")}>
        <List.Item
          title="Access status"
          subtitle="Free / Pro, trial, what is locked"
          icon={Icon.Info}
          actions={
            <ActionPanel>
              <ToolAction tool="connection_status" />
              <FooterActions />
            </ActionPanel>
          }
        />
        <List.Item
          title="Connection details"
          subtitle="Public / key / sign-in, token expiry"
          icon={Icon.Info}
          actions={
            <ActionPanel>
              <ToolAction tool="get_connection_status" />
              <FooterActions />
            </ActionPanel>
          }
        />
        <List.Item
          title="Verify live tool catalog"
          subtitle="tools/list vs this extension"
          icon={Icon.CheckList}
          actions={
            <ActionPanel>
              <Action.Push title="Verify" target={<CatalogCheck />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Request Authentication (Server-Side)"
          subtitle="connect / reauthenticate / refresh"
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <ToolAction tool="request_authentication" form />
            </ActionPanel>
          }
        />
        <List.Item
          title="Revoke Connection (Server-Side)"
          subtitle="End this connection on FirmLedger's side"
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <ToolAction tool="revoke_connection" />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={sectionLabel("Legal & help")}>
        <List.Item
          title="Help Centre"
          icon={Icon.QuestionMark}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={LINKS.help} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Terms of Use"
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={LINKS.terms} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Privacy Policy"
          icon={Icon.Lock}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={LINKS.privacy} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Create / manage API keys"
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={LINKS.apiKeys} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
