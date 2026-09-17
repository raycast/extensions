import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useToken } from "./instances";
import { Domain, ErrorResult } from "./interfaces";

// Only applications and compose stacks can have a domain; the five database kinds cannot.
type DomainableKind = "application" | "compose";
const ENDPOINTS: Record<DomainableKind, string> = {
  application: "domain.byApplicationId",
  compose: "domain.byComposeId",
};
const ID_FIELDS: Record<DomainableKind, string> = {
  application: "applicationId",
  compose: "composeId",
};

export function domainUrl(domain: Domain): string {
  const path = domain.path && domain.path !== "/" ? domain.path : "";
  return `${domain.https ? "https" : "http"}://${domain.host}${path}`;
}

/** The domains pointing at one service. */
export default function ServiceDomains({ service }: { service: { id: string; type: DomainableKind; name: string } }) {
  const { url, headers } = useToken();

  const {
    isLoading,
    data: domains,
    error,
    revalidate,
  } = useFetch<Domain[], Domain[]>(`${url}${ENDPOINTS[service.type]}?${ID_FIELDS[service.type]}=${service.id}`, {
    headers,
    initialData: [],
  });

  async function deleteDomain(domain: Domain) {
    const options: Alert.Options = {
      title: `Delete ${domain.host}?`,
      message: "The service stops answering on this domain. Nothing else about it changes.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete Domain",
      },
    };
    if (!(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, `Deleting ${domain.host}…`);
    try {
      const response = await fetch(url + "domain.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ domainId: domain.domainId }),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${domain.host}`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete domain";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`${service.name} - Domains`}>
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Could not load domains" description={`${error}`} />
      ) : domains.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Domains"
          description={`${service.name} is not reachable on any domain yet.`}
        />
      ) : (
        domains.map((domain) => (
          <List.Item
            key={domain.domainId}
            icon={{ source: Icon.Globe, tintColor: domain.https ? Color.Green : Color.SecondaryText }}
            title={domain.host}
            subtitle={domain.path && domain.path !== "/" ? domain.path : undefined}
            accessories={[
              // The container the domain resolves to is the thing worth checking on a compose stack,
              // where getting it wrong is what makes a domain quietly serve nothing.
              ...(domain.serviceName ? [{ tag: domain.serviceName, icon: Icon.Box }] : []),
              ...(domain.port ? [{ text: String(domain.port) }] : []),
              { tag: domain.https ? { value: "HTTPS", color: Color.Green } : { value: "HTTP", color: Color.Orange } },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Domain" url={domainUrl(domain)} />
                <Action.CopyToClipboard title="Copy URL" content={domainUrl(domain)} />
                <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
                <Action
                  icon={Icon.Trash}
                  title="Delete Domain"
                  style={Action.Style.Destructive}
                  onAction={() => deleteDomain(domain)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
