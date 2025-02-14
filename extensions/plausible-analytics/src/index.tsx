import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  List,
  Icon,
  useNavigation,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { FormValidation, getFavicon, useCachedState, useForm } from "@raycast/utils";
import { Storage } from "./storage";
import { verifySite, getStatsForAllWebsites } from "./api";
import { Stats } from "./types";

const { hostedDomain } = getPreferenceValues<Preferences>() ?? "https://plausible.io";

function AddSite({ refreshSiteList }: { refreshSiteList: () => void }) {
  const { pop } = useNavigation();

  const handleFormSubmit = async (values: { domain: string }) => {
    const { domain } = values;
    const toast = await showToast(Toast.Style.Animated, "Verifying");
    const isValidDomain = await verifySite(domain);

    if (!isValidDomain) {
      toast.style = Toast.Style.Failure;
      toast.title = "Verification failed";
      setValidationError("domain", "Invalid domain or API key. Please check your Plausible settings.");
      return;
    }

    await Storage.addDomain(domain);
    toast.style = Toast.Style.Success;
    toast.title = "Website successfully added";
    refreshSiteList();
    pop();
  };

  const { handleSubmit, itemProps, setValidationError } = useForm<{ domain: string }>({
    onSubmit: handleFormSubmit,
    validation: {
      domain: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="example.com, blog.example.com" {...itemProps.domain} />
    </Form>
  );
}

function SiteList() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cachedStats, setCachedStats] = useCachedState<{
    [key: string]: Stats;
  }>("website-stats", {});
  const domains = Object.keys(cachedStats);

  useEffect(() => {
    (async function () {
      setCachedStats(await getStatsForAllWebsites(await Storage.getDomains()));
      setIsLoading(false);
    })();
  }, []);

  const refreshSiteList = async () => {
    setCachedStats(await getStatsForAllWebsites(await Storage.getDomains()));
  };

  return (
    <List isShowingDetail={domains.length > 0} isLoading={isLoading}>
      {domains.map((domain) => {
        const stats = cachedStats[domain];

        return (
          <List.Item
            key={domain}
            title={domain}
            icon={getFavicon(`https://${domain}`, { fallback: Icon.Globe })}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Last 30 days" />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Unique visitors" text={`${stats.visitors.value}`} />
                    <List.Item.Detail.Metadata.Label title="Pageviews" text={`${stats.pageviews.value}`} />
                    <List.Item.Detail.Metadata.Label title="Bounce rate" text={`${stats.bounce_rate.value}%`} />
                    <List.Item.Detail.Metadata.Label title="Visit duration" text={`${stats.visit_duration.value}s`} />
                    <List.Item.Detail.Metadata.Label title="Visits/Sessions" text={`${stats.visits.value}`} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Show in Plausible" url={`${hostedDomain}/${domain}`} />
                <Action
                  icon={Icon.Xmark}
                  title={`Remove ${domain}`}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    await Storage.removeDomain(domain);
                    await showToast(Toast.Style.Success, "Website successfully removed");
                    await refreshSiteList();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.Item
        key="add-site"
        title="Add Website from Plausible"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push title="Add Website" target={<AddSite refreshSiteList={refreshSiteList} />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function Command() {
  return <SiteList />;
}
