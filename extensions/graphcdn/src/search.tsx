import {
  ActionPanel,
  List,
  Detail,
  useNavigation,
  showToast,
  ToastStyle,
  getPreferenceValues,
  OpenInBrowserAction,
  Icon,
  getLocalStorageItem,
  setLocalStorageItem,
} from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

interface Preferences {
  token: string;
}

export default function Command() {
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();
  const [orgs, setOrgs] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [services, setServices] = useState<
    { name: string; updatedAt: number; org: string; stats: { cacheHitRate: number | null } }[]
  >([]);

  useEffect(() => {
    async function run() {
      const cachedOrgs = await getLocalStorageItem("orgs");
      if (typeof cachedOrgs === "string") {
        setOrgs(JSON.parse(cachedOrgs));
      }
      const cachedServices = await getLocalStorageItem("services");
      if (typeof cachedServices === "string") {
        setServices(JSON.parse(cachedServices));
      }

      const orgs = await getOrgs();
      setOrgs(orgs);

      const services = (
        await Promise.all(
          orgs.map(async (org) => {
            const services = await getServices(org.slug);
            return services.map((service) => ({ ...service, org: org.slug }));
          })
        )
      ).flat();
      setServices(services);
      setLoading(false);

      await setLocalStorageItem("orgs", JSON.stringify(orgs));
      await setLocalStorageItem("services", JSON.stringify(services));
    }
    run();
  }, [setOrgs, setServices]);

  const onFetchConfig = async (serviceName: string) => {
    setLoading(true);
    try {
      const config = await getConfig(serviceName);
      push(<Detail markdown={`\`\`\`\n${JSON.stringify(config, null, "  ")}\n\`\`\``} />);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <List isLoading={loading}>
      {orgs.map((org) => (
        <List.Section title={org.name} key={org.id}>
          {services
            .filter((service) => service.org === org.slug)
            .map((service) => (
              <List.Item
                title={service.name}
                accessoryTitle={
                  typeof service.stats.cacheHitRate === "number"
                    ? `${(service.stats.cacheHitRate * 100).toFixed(2)}% Cache hit rate`
                    : undefined
                }
                key={service.name}
                actions={
                  <ActionPanel>
                    <OpenInBrowserAction
                      url={`https://graphcdn.io/dashboard/${org.slug}/${service.name}/overview`}
                      title="Open Dashboard"
                    />
                    <ActionPanel.Item
                      title="Fetch configuration"
                      onAction={() => onFetchConfig(service.name)}
                      icon={Icon.MemoryChip}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

async function execGraphCDN(query: string, variables?: any) {
  const preferences: Preferences = getPreferenceValues();
  const body = JSON.stringify({
    query,
    variables,
  });
  const res = await fetch(`https://graphcdn.io/api/`, {
    headers: { "Content-Type": "application/json", "graphcdn-token": preferences.token },
    method: "POST",
    body,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (o) {
    throw new Error(text);
  }
  if (data.errors) {
    console.log(data.errors);
    throw new Error(data.errors[0].message);
  }

  return data.data;
}

function showFailureToast(error: any, title: string) {
  if (error.message.toLowerCase().includes("not authorized")) {
    showToast(ToastStyle.Failure, "Invalid api token", "Update the Access token in the preferences");
  } else {
    showToast(ToastStyle.Failure, title, error.message);
  }
}

async function getOrgs() {
  try {
    return (
      await execGraphCDN(`
    {
      user {
        organizations {
          id
          name
          slug
        }
      }
    }
  `)
    ).user.organizations as { id: string; slug: string; name: string }[];
  } catch (err) {
    showFailureToast(err, "Could not fetch the GraphCDN organizations");
    return [];
  }
}

async function createOrg(name: string) {
  try {
    return (
      await execGraphCDN(
        `
        mutation createOrganization($name: String!) {
          organization {
            create(name: $name) {
              id
              name
              slug
            }
          }
        }
        `,
        { name }
      )
    ).organization.create as { id: string; slug: string; name: string };
  } catch (err) {
    showFailureToast(err, "Could not create the GraphCDN organization");
    return undefined;
  }
}

async function isServiceNameTaken(appName: string) {
  try {
    return (
      await execGraphCDN(
        `
        query isAppNameTaken($appName: ServiceName) {
          isAppNameTaken(name: $appName)
        }
      `,
        { appName }
      )
    ).isAppNameTaken as boolean;
  } catch (err) {
    showFailureToast(err, "Could not check if the service name is available");
    return true;
  }
}

async function getServices(orgSlug: string) {
  try {
    return (
      (
        await execGraphCDN(
          `
        query getOrganization($slug: String!, $interval: Interval!, $filter: FilterInput) {
          organization(slug: $slug) {
            name
            apps {
              name
              updatedAt
              stats(interval: $interval, filter: $filter) {
                cacheHitRate
              }
            }
          }
        }
  `,
          { slug: orgSlug, interval: "T1D", filter: {} }
        )
      ).organization.apps as { name: string; updatedAt: number; stats: { cacheHitRate: number | null } }[]
    ).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  } catch (err) {
    showFailureToast(err, "Could not fetch the GraphCDN services");
    return [];
  }
}

async function getConfig(service: string) {
  try {
    const res = await execGraphCDN(
      `
        query ($name: ServiceName, $interval: Interval!, $filter: FilterInput) {
          app(name: $name) {
            organization {
              slug
            }
            stats(interval: $interval, filter: $filter) {
              cacheHitRate
            }
            config {
              passThroughOnly
              input
              rules {
                maxAge
              }
            }
          }
        }
  `,
      { name: service, interval: "T1D", filter: {} }
    );
    return res.app.config as any;
  } catch (err) {
    showFailureToast(err, "Could not fetch the configuration of the GraphCDN service");
    return {};
  }
}
