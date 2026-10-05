// Proxies command: whole-host proxies + per-site path rules with add/remove.
//
// Argv verified against Yerd CLI `proxy --help`:
//   list:   `yerd proxy list` → ProxiesResponse { proxies: [], rules: [] }
//   add:    two args = whole-host (`yerd proxy add reverb http://localhost:8080`);
//           three args = path rule (`yerd proxy add myapp /app http://…`) — the
//           form here covers whole-host adds; rules remain removable below.
//   remove: one arg = whole-host (`yerd proxy remove reverb`);
//           two args = path rule (`yerd proxy remove myapp /app`)
//
// Upstream validation is FORMAT-only (http/https URL). Yerd itself accepts
// public upstreams and rejects only malformed/refused ones — we surface its
// errors rather than restricting locality client-side.

import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { runYerd, TIMEOUTS } from "./yerd/cli";
import type { ProxiesResponse, StatusResponse } from "./yerd/types";

const PROXIES_GUIDE_URL = "https://yerd.app/guide/proxies";

function userMessage(e: unknown): string {
  const msg = (e as { userMessage?: string }).userMessage;
  return msg ?? "Yerd command failed";
}

function validateDnsLabel(name: string): string | undefined {
  if (!name) return "Name is required";
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
    return "Must be a valid DNS label (lowercase alphanumeric and hyphens)";
  }
  return undefined;
}

function validateUpstreamUrl(url: string): string | undefined {
  if (!url) return "URL is required";
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return "URL must start with http:// or https://";
    }
  } catch {
    return "Enter a valid URL (e.g. http://127.0.0.1:8000)";
  }
  return undefined;
}

function AddProxyForm({ onAdded }: { onAdded: () => void }) {
  const { pop } = useNavigation();

  async function submit(values: { name: string; url: string }) {
    const name = values.name.trim();
    const url = values.url.trim();
    const nameError = validateDnsLabel(name);
    if (nameError) {
      await showToast({ style: Toast.Style.Failure, title: nameError });
      return;
    }
    const urlError = validateUpstreamUrl(url);
    if (urlError) {
      await showToast({ style: Toast.Style.Failure, title: urlError });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adding proxy ${name}…`,
    });
    try {
      await runYerd(["proxy", "add", name, url], {
        timeoutMs: TIMEOUTS.mutate,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Proxy ${name} added`;
      onAdded();
      pop();
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Proxy"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="myapp"
        info="DNS label — becomes myapp.test"
      />
      <Form.TextField
        id="url"
        title="Upstream URL"
        placeholder="http://127.0.0.1:8000"
        info="Local or public HTTP(S) upstream the host will forward to"
      />
    </Form>
  );
}

export default function Proxies() {
  const { isLoading, data, revalidate } = useCachedPromise(
    () => runYerd<ProxiesResponse>(["proxy", "list"]),
    [],
    {
      keepPreviousData: true,
    },
  );
  const { data: statusData } = useCachedPromise(
    () => runYerd<StatusResponse>(["status"]),
    [],
    {
      keepPreviousData: true,
    },
  );

  const proxies = data?.proxies ?? [];
  const rules = data?.rules ?? [];
  const tld = statusData?.report?.tld ?? "test";

  async function removeProxy(name: string) {
    const ok = await confirmAlert({
      title: `Remove proxy "${name}.${tld}"?`,
      message: "Traffic to this host will no longer be forwarded.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Removing ${name}…`,
    });
    try {
      // Whole-host proxy: one positional
      await runYerd(["proxy", "remove", name], { timeoutMs: TIMEOUTS.mutate });
      toast.style = Toast.Style.Success;
      toast.title = `Proxy ${name} removed`;
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  async function removeRule(site: string, prefix: string) {
    const ok = await confirmAlert({
      title: `Remove path rule "${prefix}" from "${site}.${tld}"?`,
      message: "Requests under this prefix will be served by the site again.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing rule…",
    });
    try {
      // Path rule: two positionals — site then prefix
      await runYerd(["proxy", "remove", site, prefix], {
        timeoutMs: TIMEOUTS.mutate,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Rule ${prefix} removed`;
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  if (!isLoading && proxies.length === 0 && rules.length === 0) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Switch}
          title="No proxies"
          description={`Proxies forward a .${tld} host or a site path to a local upstream — handy for Reverb, Vite, or any dev server. See ${PROXIES_GUIDE_URL}.`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Proxy"
                icon={Icon.Plus}
                target={<AddProxyForm onAdded={revalidate} />}
              />
              <Action.OpenInBrowser
                title="Open Proxies Guide"
                url={PROXIES_GUIDE_URL}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search proxies…">
      {proxies.length > 0 && (
        <List.Section title="Whole-Host Proxies">
          {proxies.map((proxy) => (
            <List.Item
              key={proxy.name}
              icon={Icon.Globe}
              title={`${proxy.name}.${tld}`}
              subtitle={proxy.target}
              accessories={proxy.secure ? [{ icon: Icon.Lock }] : []}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={`http${proxy.secure ? "s" : ""}://${proxy.name}.${tld}`}
                    />
                    <Action.CopyToClipboard
                      title="Copy Upstream URL"
                      content={proxy.target}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Add Proxy"
                      icon={Icon.Plus}
                      target={<AddProxyForm onAdded={revalidate} />}
                    />
                    <Action
                      title="Remove Proxy"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => removeProxy(proxy.name)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.RotateClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {rules.length > 0 && (
        <List.Section title="Path Rules">
          {rules.map((rule) => (
            <List.Item
              key={`${rule.site}${rule.prefix}`}
              icon={Icon.ArrowRight}
              title={`${rule.site}.${tld}${rule.prefix}`}
              subtitle={rule.target}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Upstream URL"
                      content={rule.target}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Add Proxy"
                      icon={Icon.Plus}
                      target={<AddProxyForm onAdded={revalidate} />}
                    />
                    <Action
                      title="Remove Rule"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => removeRule(rule.site, rule.prefix)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.RotateClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section>
        <List.Item
          title="Add Proxy"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Proxy"
                icon={Icon.Plus}
                target={<AddProxyForm onAdded={revalidate} />}
              />
              <Action.OpenInBrowser
                title="Open Proxies Guide"
                url={PROXIES_GUIDE_URL}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
