import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { runYerd, TIMEOUTS } from "../yerd/cli";

interface DomainGroup {
  name: string;
  primary: string;
  domains: string[];
  apex_shadowed_by: string | null;
}

interface DomainListResponse {
  domains?: DomainGroup[];
}

interface DomainEntry {
  domain: string;
  primary: boolean;
}

interface AddDomainValues {
  domain: string;
}

function userMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "userMessage" in error) {
    const { userMessage: message } = error;
    if (typeof message === "string") return message;
  }
  return "Failed";
}

export function DomainsView({ site, tld }: { site: string; tld: string }) {
  const { isLoading, data, revalidate } = useCachedPromise(
    () => runYerd<DomainListResponse>(["domain", "list", site]),
    [],
    { keepPreviousData: true },
  );

  const domainGroup =
    data?.domains?.find((entry) => entry.name === site) ?? data?.domains?.[0];
  const domains: DomainEntry[] =
    domainGroup?.domains.map((domain) => ({
      domain,
      primary: domain === domainGroup.primary,
    })) ?? [];

  async function addDomain(domain: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adding ${domain}…`,
    });
    try {
      await runYerd(["domain", "add", site, domain], {
        timeoutMs: TIMEOUTS.mutate,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Added ${domain}`;
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: userMessage(error) });
    }
  }

  async function makePrimary(domain: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Setting primary to ${domain}…`,
    });
    try {
      await runYerd(["domain", "primary", site, domain], {
        timeoutMs: TIMEOUTS.mutate,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Primary set to ${domain}`;
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: userMessage(error) });
    }
  }

  async function removeDomain(domain: string) {
    const confirmed = await confirmAlert({
      title: `Remove domain "${domain}"?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Removing ${domain}…`,
    });
    try {
      await runYerd(["domain", "remove", site, domain], {
        timeoutMs: TIMEOUTS.mutate,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Removed ${domain}`;
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: userMessage(error) });
    }
  }

  async function resetDomains() {
    const confirmed = await confirmAlert({
      title: `Reset domains for "${site}"?`,
      message: `Resets to ${site}.${tld} only. All custom domains will be removed.`,
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Resetting domains…",
    });
    try {
      await runYerd(["domain", "reset", site], { timeoutMs: TIMEOUTS.mutate });
      toast.style = Toast.Style.Success;
      toast.title = "Domains reset";
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: userMessage(error) });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Domains — ${site}`}>
      <List.Section title={`Domains for ${site}.${tld}`}>
        {domains.map((entry) => (
          <List.Item
            key={entry.domain}
            title={entry.domain}
            accessories={
              entry.primary
                ? [{ tag: { value: "Primary", color: "Green" } }]
                : []
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Domain"
                  content={entry.domain}
                />
                {!entry.primary && (
                  <Action
                    title="Make Primary"
                    icon={Icon.Star}
                    onAction={() => makePrimary(entry.domain)}
                  />
                )}
                <Action
                  title="Remove"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeDomain(entry.domain)}
                />
                <Action
                  title="Reset All Domains"
                  icon={Icon.ArrowCounterClockwise}
                  style={Action.Style.Destructive}
                  onAction={resetDomains}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section>
        <List.Item
          title="Add Domain"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Domain"
                icon={Icon.Plus}
                target={
                  <Form
                    actions={
                      <ActionPanel>
                        <Action.SubmitForm<AddDomainValues>
                          title="Add"
                          onSubmit={(values) => addDomain(values.domain)}
                        />
                      </ActionPanel>
                    }
                  >
                    <Form.TextField
                      id="domain"
                      title="Domain"
                      placeholder={`api.${site}.${tld}`}
                      info={`Full FQDN under your TLD. Wildcards: *.${site}.${tld}`}
                    />
                  </Form>
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
