import { Action, ActionPanel, Icon } from "@raycast/api";
import { surfacePageUrl, type Credential, type Surface, type SurfacePackage } from "./api";

function webUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return value.trim();
  } catch {
    // Optional API fields can be missing or contain a non-URL description.
  }
}

function installCommand(pkg: SurfacePackage): string | undefined {
  // The API supplies package identifiers, not install commands. Do not interpret
  // command/runtimeHint as shell snippets or guess commands for other registries.
  if (typeof pkg?.identifier !== "string" || !pkg.identifier) return;
  if (pkg.registryType === "npm" && /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(pkg.identifier)) {
    return `npm install --global ${pkg.identifier}`;
  }
  if (
    (pkg.registryType === "brew" || pkg.registryType === "homebrew") &&
    /^[a-z0-9][a-z0-9@+._-]*(?:\/[a-z0-9][a-z0-9@+._-]*\/[a-z0-9][a-z0-9@+._-]*)?$/.test(pkg.identifier)
  ) {
    return `brew install ${pkg.identifier}`;
  }
}

export function SurfaceActions({
  domain,
  surface,
  credentials = {},
}: {
  domain: string;
  surface: Surface;
  credentials?: Record<string, Credential>;
}) {
  const mcpUrl = surface.type === "mcp" ? webUrl(surface.url) : undefined;
  const commands =
    surface.type === "cli"
      ? Array.from(new Set((surface.packages ?? []).map(installCommand).filter((command) => command !== undefined)))
      : [];
  const credentialIds =
    surface.auth?.status === "required"
      ? new Set(
          (surface.auth.entries ?? []).flatMap((entry) => (entry.use ?? []).flatMap((use) => (use.id ? [use.id] : []))),
        )
      : new Set<string>();
  const pages = Array.from(credentialIds).flatMap((id) => {
    const credential = credentials[id];
    const url = webUrl(credential?.generateUrl);
    return url ? [{ id, title: credential.label || id, url }] : [];
  });

  return (
    <ActionPanel.Submenu title={surface.name} icon={Icon.Terminal}>
      {mcpUrl && <Action.CopyToClipboard title="Copy MCP URL" content={mcpUrl} />}
      {commands.length === 1 && <Action.CopyToClipboard title="Copy Install Command" content={commands[0]} />}
      {commands.length > 1 && (
        <ActionPanel.Submenu title="Copy Install Command" icon={Icon.Clipboard}>
          {commands.map((command) => (
            <Action.CopyToClipboard key={command} title={command} content={command} />
          ))}
        </ActionPanel.Submenu>
      )}
      {pages.length === 1 && <Action.OpenInBrowser title="Open Credential Page" url={pages[0].url} />}
      {pages.length > 1 && (
        <ActionPanel.Submenu title="Open Credential Page" icon={Icon.Key}>
          {pages.map((page) => (
            <Action.OpenInBrowser key={page.id} title={page.title} url={page.url} />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action.OpenInBrowser title="Open Surface Page" url={surfacePageUrl(domain, surface.slug)} />
    </ActionPanel.Submenu>
  );
}
