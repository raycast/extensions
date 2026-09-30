import { Action, ActionPanel, Icon, Keyboard, List, open, showToast, Toast, useNavigation } from "@raycast/api";
import { Domain, ErrorResult } from "./interfaces";
import { type DomainableKind, domainUrl, ENDPOINTS as DOMAIN_ENDPOINTS, ID_FIELDS } from "./service-domains";

interface WebsiteService {
  id: string;
  type: DomainableKind;
  name: string;
}

/**
 * Opens a service's website without going through its Domains screen. Domains are fetched only when
 * the action runs, so the lists this sits in don't pay for a request per row. Dokploy has no notion
 * of a primary domain (they come back unordered), so with more than one the user picks.
 */
export function OpenWebsiteAction({
  service,
  url,
  headers,
  onOpen,
}: {
  service: WebsiteService;
  url: string;
  headers: Record<string, string>;
  onOpen?: () => void;
}) {
  const { push } = useNavigation();

  async function openWebsite() {
    const toast = await showToast(Toast.Style.Animated, "Finding website", service.name);
    try {
      const response = await fetch(`${url}${DOMAIN_ENDPOINTS[service.type]}?${ID_FIELDS[service.type]}=${service.id}`, {
        headers,
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => undefined)) as ErrorResult | undefined;
        throw new Error(err?.message ?? `Request failed with status ${response.status}`);
      }
      const allDomains = (await response.json()) as Domain[];
      // A disabled domain isn't routed anymore, so it can't be the website.
      const domains = allDomains.filter((domain) => domain.enabled !== false);
      if (domains.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = allDomains.length
          ? `Every domain of ${service.name} is disabled`
          : `${service.name} has no domain`;
        toast.message = allDomains.length ? "Enable one from View Domains." : "Add one from View Domains.";
        return;
      }
      onOpen?.();
      if (domains.length === 1) {
        await toast.hide();
        await open(domainUrl(domains[0]));
        return;
      }
      await toast.hide();
      push(<PickWebsite service={service} domains={domains} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not load domains";
      toast.message = `${error}`;
    }
  }

  return (
    <Action icon={Icon.Globe} title="Open Website" shortcut={Keyboard.Shortcut.Common.Open} onAction={openWebsite} />
  );
}

function PickWebsite({ service, domains }: { service: WebsiteService; domains: Domain[] }) {
  return (
    <List navigationTitle={`${service.name} - Open Website`}>
      {domains.map((domain) => {
        const target = domainUrl(domain);
        return (
          <List.Item
            key={domain.domainId}
            icon={Icon.Globe}
            title={target}
            accessories={domain.serviceName ? [{ tag: domain.serviceName, icon: Icon.Box }] : []}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={target} />
                <Action.CopyToClipboard title="Copy URL" content={target} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
