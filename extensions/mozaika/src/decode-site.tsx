import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  DesignSystem,
  agentPrompt,
  authHeaders,
  BROWSE_URL,
  CONNECT_URL,
  decodeEndpoint,
  host,
  normalizeSiteInput,
  PRICING_URL,
  strip,
} from "./lib/api";

const ROLE_ORDER: [string, string][] = [
  ["background", "Background"],
  ["text", "Text"],
  ["primary", "Primary"],
  ["accent", "Accent"],
  ["link", "Link"],
  ["button_bg", "Button"],
];

export default function DecodeSite(props: { arguments: Arguments.DecodeSite }) {
  const site = normalizeSiteInput(props.arguments.url);

  const { isLoading, data, error } = useFetch<DesignSystem>(decodeEndpoint(site), {
    headers: authHeaders(),
    execute: site.length > 0,
    keepPreviousData: false,
    parseResponse: async (res) => {
      if (res.status === 429) throw new Error("LIMIT");
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(j.detail || "Couldn't decode that site.");
      }
      return (await res.json()) as DesignSystem;
    },
  });

  if (!site) {
    return <Detail markdown={"# Enter a site to decode\n\nPass a URL like `linear.app` or `stripe.com`."} />;
  }

  if (error) {
    const limited = error.message === "LIMIT";
    const markdown = limited
      ? "# Daily decode limit reached\n\nYou've used today's free decodes. Paste a **Founder/Pro token** in Extension Preferences for unlimited decodes, or open the full Mozaika library."
      : `# Couldn't decode ${host(site)}\n\n${error.message}\n\nTry a root domain or another page.`;
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            {limited && <Action.OpenInBrowser title="Unlock — Founder License" url={PRICING_URL} icon={Icon.Stars} />}
            <Action.OpenInBrowser title="Get a Token (Connect)" url={CONNECT_URL} icon={Icon.Key} />
            <Action.OpenInBrowser title="Open Mozaika" url={BROWSE_URL} icon={Icon.Image} />
          </ActionPanel>
        }
      />
    );
  }

  const ds = data;

  return (
    <Detail
      isLoading={isLoading}
      markdown={ds ? buildMarkdown(ds, site) : `# Decoding ${host(site)}…`}
      metadata={ds ? <Meta ds={ds} /> : undefined}
      actions={
        ds ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Agent Prompt" content={agentPrompt(ds)} icon={Icon.Wand} />
            <Action.CopyToClipboard
              title="Copy Design System (JSON)"
              content={JSON.stringify(strip(ds), null, 2)}
              icon={Icon.CodeBlock}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "j" }, Windows: { modifiers: ["ctrl"], key: "j" } }}
            />
            <Action.OpenInBrowser title={`Open ${host(site)}`} url={site} icon={Icon.Globe} />
            <Action.OpenInBrowser title="Open Mozaika Library" url={BROWSE_URL} icon={Icon.Image} />
            <Action.OpenInBrowser
              title="Unlock the Full Library — Founder"
              url={PRICING_URL}
              icon={Icon.Stars}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "u" }, Windows: { modifiers: ["ctrl"], key: "u" } }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function colorRoles(ds: DesignSystem): [string, string, string][] {
  const colors = ds.colors ?? {};
  return ROLE_ORDER.filter(([key]) => colors[key]).map(([key, label]) => [key, label, colors[key] as string]);
}

function Meta({ ds }: { ds: DesignSystem }) {
  const fonts = ds.font_roles ?? {};
  const ts = ds.type_scale ?? {};
  const roles = colorRoles(ds);
  const fontText =
    fonts.heading || fonts.body
      ? [fonts.heading, fonts.body].filter(Boolean).join(" · ")
      : (ds.fonts ?? []).join(" · ");
  const scaleText = [ts.h1 && `H1 ${ts.h1}`, ts.h2 && `H2 ${ts.h2}`, ts.body && `Body ${ts.body}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Detail.Metadata>
      {ds.color_scheme && <Detail.Metadata.Label title="Scheme" text={ds.color_scheme} />}
      {roles.length > 0 && (
        <Detail.Metadata.TagList title="Colors">
          {roles.map(([key, label, hex]) => (
            <Detail.Metadata.TagList.Item key={key} text={`${label} ${hex}`} color={hex} />
          ))}
        </Detail.Metadata.TagList>
      )}
      {fontText && <Detail.Metadata.Label title="Fonts" text={fontText} />}
      {scaleText && <Detail.Metadata.Label title="Type scale" text={scaleText} />}
      {ds.radius && <Detail.Metadata.Label title="Radius" text={ds.radius} />}
      {ds.framework && <Detail.Metadata.Label title="Framework" text={ds.framework} />}
      {ds.url && <Detail.Metadata.Link title="Source" target={ds.url} text={host(ds.url)} />}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link title="Mozaika" target={BROWSE_URL} text="Browse the library" />
    </Detail.Metadata>
  );
}

function buildMarkdown(ds: DesignSystem, site: string): string {
  const lines: string[] = [];
  lines.push(`# ${ds.site || host(site)}`);
  lines.push("");
  lines.push(
    "Decoded design system — real colors, fonts, type scale and the primary button recipe. Copy it as an agent prompt and build to spec.",
  );
  lines.push("");

  const roles = colorRoles(ds);
  if (roles.length > 0) {
    lines.push("## Colors");
    lines.push("");
    lines.push("| Role | Hex |");
    lines.push("| --- | --- |");
    roles.forEach(([, label, hex]) => lines.push(`| ${label} | \`${hex}\` |`));
    lines.push("");
  }

  lines.push("## Design system");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(strip(ds), null, 2));
  lines.push("```");
  return lines.join("\n");
}
