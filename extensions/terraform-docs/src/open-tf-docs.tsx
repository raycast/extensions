import { Action, ActionPanel, List, open, showToast, Toast } from "@raycast/api";
import { useState } from "react";

const PROVIDER_MAP: Record<string, { namespace: string; provider: string; label: string }> = {
  aws:        { namespace: "hashicorp",    provider: "aws",        label: "AWS" },
  azurerm:    { namespace: "hashicorp",    provider: "azurerm",    label: "Azure" },
  azuread:    { namespace: "hashicorp",    provider: "azuread",    label: "Azure AD" },
  google:     { namespace: "hashicorp",    provider: "google",     label: "Google Cloud" },
  kubernetes: { namespace: "hashicorp",    provider: "kubernetes", label: "Kubernetes" },
  helm:       { namespace: "hashicorp",    provider: "helm",       label: "Helm" },
  vault:      { namespace: "hashicorp",    provider: "vault",      label: "Vault" },
  consul:     { namespace: "hashicorp",    provider: "consul",     label: "Consul" },
  github:     { namespace: "integrations", provider: "github",     label: "GitHub" },
  gitlab:     { namespace: "gitlabhq",     provider: "gitlab",     label: "GitLab" },
  cloudflare: { namespace: "cloudflare",   provider: "cloudflare", label: "Cloudflare" },
  datadog:    { namespace: "datadog",      provider: "datadog",    label: "Datadog" },
  random:     { namespace: "hashicorp",    provider: "random",     label: "Random" },
  null:       { namespace: "hashicorp",    provider: "null",       label: "Null" },
  local:      { namespace: "hashicorp",    provider: "local",      label: "Local" },
  tls:        { namespace: "hashicorp",    provider: "tls",        label: "TLS" },
};

function buildUrl(p: { namespace: string; provider: string }, type: string, path: string) {
  return `https://registry.terraform.io/providers/${p.namespace}/${p.provider}/latest/docs/${type}/${path}`;
}

function parseResource(raw: string) {
  const input = raw.trim().replace(/^(tf|terraform)\s+/i, "").split(".")[0].trim();
  const idx = input.indexOf("_");
  if (idx === -1) return null;
  const prefix = input.slice(0, idx);
  const path = input.slice(idx + 1);
  return { input, prefix, path, provider: PROVIDER_MAP[prefix] ?? null };
}

async function go(url: string) {
  await open(url);
  await showToast({ style: Toast.Style.Success, title: "Opening…" });
}

export default function Command() {
  const [q, setQ] = useState("");
  const p = q ? parseResource(q) : null;

  const items = !p ? [] : !p.provider ? [
    { icon: "🔍", title: `Unknown: "${p.prefix}"`, sub: "Search registry", url: `https://registry.terraform.io/search/providers?q=${p.prefix}` },
  ] : [
    { icon: "📄", title: p.input, sub: `${p.provider.label} Resource`, url: buildUrl(p.provider, "resources", p.path) },
    { icon: "🗂️", title: p.input, sub: `${p.provider.label} Data Source`, url: buildUrl(p.provider, "data-sources", p.path) },
    { icon: "🏠", title: `${p.provider.provider} provider`, sub: `${p.provider.label} overview`, url: `https://registry.terraform.io/providers/${p.provider.namespace}/${p.provider.provider}/latest/docs` },
  ];

  return (
    <List searchBarPlaceholder="aws_s3_bucket · google_compute_instance · data.aws_ami" onSearchTextChange={setQ} throttle>
      {items.length === 0 ? (
        <List.EmptyView icon="📖" title="Terraform Docs" description="Type a resource name" />
      ) : (
        items.map((item, i) => (
          <List.Item
            key={i}
            icon={item.icon}
            title={item.title}
            subtitle={item.sub}
            actions={
              <ActionPanel>
                <Action title="Open in Browser" onAction={() => go(item.url)} />
                <Action.CopyToClipboard title="Copy URL" content={item.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
