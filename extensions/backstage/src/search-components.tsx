import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { authorize, client } from "./oauth";
import fetch from "node-fetch";

type Service = {
  name: string;
  description: string;
  owner: string;
  backstageUrl: string;
  links: {
    name: string;
    url: string;
  }[];
};

type Preferences = {
  iapOAuthClientId: string;
  raycastOAuthClientId: string;
  backstageUrl: string;
  backstageStaticToken: string;
  backstageApiUrl: string;
};

const preferences: Preferences = getPreferenceValues();

export default function Command() {
  const { data, isLoading } = useCachedPromise(getServices);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Components">
        {data?.map((svc) => (
          <List.Item
            key={svc.name}
            title={svc.name}
            subtitle={svc.description}
            accessories={[
              {
                icon: Icon.Person,
                text: svc.owner,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Search Links" target={<SearchLinks svc={svc} />} />
                <Action.OpenInBrowser title="Open in Backstage" url={svc.backstageUrl} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchLinks({ svc }: { svc: Service }) {
  return (
    <List>
      <List.Section title="Links">
        {svc.links.map((link) => (
          <List.Item
            key={link.name}
            title={link.name}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Link" url={link.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

async function getAuthTokenIfNeeded() {
  if (preferences.backstageStaticToken) {
    return preferences.backstageStaticToken;
  }

  if (preferences.raycastOAuthClientId && preferences.iapOAuthClientId) {
    await authorize(["openid", "email"], preferences.raycastOAuthClientId, preferences.iapOAuthClientId);
    const tokens = await client.getTokens();
    return tokens?.idToken;
  }

  return null;
}

async function fetchBackstage() {
  const authToken = await getAuthTokenIfNeeded();
  const url = preferences.backstageApiUrl || preferences.backstageUrl;

  const res = await fetch(`${url}/api/catalog/entities?filter=kind=component`, {
    headers: authToken
      ? {
          Authorization: `Bearer ${authToken}`,
        }
      : undefined,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Backstage. ${res.status}: ${await res.text()}`);
  }

  const body = await res.json();
  return body;
}

async function getServices(): Promise<Service[]> {
  const body = await fetchBackstage();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (body as any[])
    .map((v) => {
      return {
        name: v.metadata.name,
        description: v.metadata.description,
        owner: v.spec.owner,
        backstageUrl: `${preferences.backstageUrl}/catalog/${v.metadata.namespace}/component/${v.metadata.name}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        links: ((v.metadata.links ?? []) as any[])
          .map((link: { title: string; url: string }) => ({
            name: link.title,
            url: link.url,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      } as Service;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
