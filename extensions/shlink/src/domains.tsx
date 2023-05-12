import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedState, useForm } from "@raycast/utils";
import { ActionCopyToClipboard, apiFetch, hashedHSL, HealthCheck, useApiFetchSimple } from "./shared";
import { useState } from "react";
import Visits from "./visits";

interface RedirectObject {
  baseUrlRedirect?: string; // URL to redirect to when a user hits the domain's base URL
  regular404Redirect?: string; // URL to redirect to when a user hits a not found URL other than an invalid short URL
  invalidShortUrlRedirect?: string; // URL to redirect to when a user hits an invalid short URL
}

interface DataObject {
  domain: string;
  isDefault: boolean;
  redirects: RedirectObject;
}

interface RequestObject {
  domains: {
    data: DataObject[];
    defaultRedirects: RedirectObject;
  };
}

export default function Command() {
  const [healthCheck, setHealthCheck] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useCachedState<boolean>("showDetails", false);
  const [tempHideDetails, setTempHideDetails] = useState<boolean>(true);

  const { isLoading, data, revalidate } = useApiFetchSimple<RequestObject>("domains");
  const { push } = useNavigation();

  const {
    domains: { data: items, defaultRedirects },
  } = data || ({ domains: { data: [], defaultRedirects: {} } } as RequestObject);

  const refresh = (
    <Action
      title="Refresh Data"
      icon={{ source: Icon.Repeat }}
      shortcut={{ key: "r", modifiers: ["cmd"] }}
      onAction={revalidate}
    />
  );
  const defaultRedirectsActions = <ActionPanel>{refresh}</ActionPanel>;

  return (
    <HealthCheck onLoading={setHealthCheck} renderWhileLoading>
      <List
        isLoading={healthCheck || isLoading}
        navigationTitle="Search Domains"
        searchBarPlaceholder="Search your tags"
        selectedItemId="base-url-redirects"
        onSelectionChange={(item) =>
          setTempHideDetails(
            ["base-url-redirects", "default-redirects", "invalid-short-url-redirects"].includes(item || "")
          )
        }
        isShowingDetail={showDetails && !tempHideDetails}
      >
        {!data ? (
          <List.EmptyView
            actions={
              <ActionPanel>
                <Action title="Refresh Data" icon={{ source: Icon.Repeat }} onAction={revalidate} />
              </ActionPanel>
            }
            title="No Domains Found"
            icon={{ source: Icon.Globe }}
          />
        ) : (
          <>
            <List.Section title="Default Redirects" subtitle="Default settings of your Shlink">
              <List.Item
                id="base-url-redirects"
                title="Base URL Redirects"
                subtitle={defaultRedirects.baseUrlRedirect || "Disabled"}
                actions={defaultRedirectsActions}
              />
              <List.Item
                id="default-redirects"
                title="Regular 404 Regirects"
                subtitle={defaultRedirects.regular404Redirect || "Disabled"}
                actions={defaultRedirectsActions}
              />
              <List.Item
                id="invalid-short-url-redirects"
                title="Invalid Short URL Redirects"
                subtitle={defaultRedirects.invalidShortUrlRedirect || "Disabled"}
                actions={defaultRedirectsActions}
              />
            </List.Section>

            <List.Section title="Domains" subtitle={items?.length.toString()}>
              {items.map((item) => (
                <List.Item
                  icon={{ source: Icon.Globe, tintColor: hashedHSL(item.domain) }}
                  key={item.domain}
                  title={item.domain}
                  subtitle={item.isDefault ? "Used as Default domain" : undefined}
                  accessories={!showDetails || tempHideDetails ? accessories(item) : []}
                  detail={<List.Item.Detail metadata={meta(item)} />}
                  actions={
                    <ActionPanel>
                      <Action
                        title={showDetails ? "Hide Details" : "Show Details"}
                        icon={{ source: Icon.Sidebar }}
                        onAction={() => setShowDetails(!showDetails)}
                      />
                      <Action
                        title="View Visits"
                        icon={{ source: Icon.Eye }}
                        onAction={() =>
                          push(
                            <Visits
                              item={{
                                type: "domains",
                                value: item.domain,
                                title: `Visits by "${item.domain}" Domain`,
                                placeholder: `Search Visits by "${item.domain}" Domain...`,
                              }}
                            />
                          )
                        }
                      />
                      <Action.Push
                        title="Edit Default Redirects"
                        icon={{ source: Icon.Pencil }}
                        shortcut={{ key: "e", modifiers: ["cmd"] }}
                        target={<EditRedirects defaultRedirects={defaultRedirects} domain={item.domain} />}
                      />
                      {refresh}
                      <ActionPanel.Section title="Copy ... to Clipboard">
                        <ActionCopyToClipboard
                          title="Copy Domain"
                          content={item.domain}
                          toastTitle="Domain Copied to Clipboard!"
                          shortcut={{ key: "c", modifiers: ["cmd"] }}
                        />
                        {item.redirects.baseUrlRedirect && (
                          <ActionCopyToClipboard
                            title="Copy Base URL Redirect"
                            content={item.redirects.baseUrlRedirect}
                            toastTitle="Base URL Redirect Copied to Clipboard!"
                            shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
                          />
                        )}
                        {item.redirects.invalidShortUrlRedirect && (
                          <ActionCopyToClipboard
                            title="Copy Invalid Short URL Redirect"
                            content={item.redirects.invalidShortUrlRedirect}
                            toastTitle="Invalid Short URL Redirect Copied to Clipboard!"
                            shortcut={{ key: "c", modifiers: ["cmd", "opt"] }}
                          />
                        )}
                        {item.redirects.regular404Redirect && (
                          <ActionCopyToClipboard
                            title="Copy Regular 404 URL Redirect"
                            content={item.redirects.regular404Redirect}
                            toastTitle="Regular 404 URL Redirect Copied to Clipboard!"
                            shortcut={{ key: "c", modifiers: ["cmd", "ctrl"] }}
                          />
                        )}
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          </>
        )}
      </List>
    </HealthCheck>
  );
}

const accessories = (item: DataObject): List.Item.Accessory[] => [
  {
    text: "Base URL Redirects",
    tooltip: item.redirects.baseUrlRedirect,
    icon: {
      source: item.redirects.baseUrlRedirect ? Icon.CheckCircle : Icon.XMarkCircle,
      tintColor: item.redirects.baseUrlRedirect ? Color.Green : Color.Red,
    },
  },
  {
    text: "Regular 404 Redirects",
    tooltip: item.redirects.regular404Redirect,
    icon: {
      source: item.redirects.regular404Redirect ? Icon.CheckCircle : Icon.XMarkCircle,
      tintColor: item.redirects.regular404Redirect ? Color.Green : Color.Red,
    },
  },
  {
    text: "Invalid Short URL Redirects",
    tooltip: item.redirects.invalidShortUrlRedirect,
    icon: {
      source: item.redirects.invalidShortUrlRedirect ? Icon.CheckCircle : Icon.XMarkCircle,
      tintColor: item.redirects.invalidShortUrlRedirect ? Color.Green : Color.Red,
    },
  },
];

function meta(item: DataObject) {
  const M = List.Item.Detail.Metadata;
  const link = (title: string, url?: string) => {
    if (!url) return <M.Label title={title} text="" />;
    return <M.Link title={title} target={url} text={url} />;
  };

  return (
    <M>
      <M.Label
        title="Is Default"
        icon={
          item.isDefault
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.XMarkCircle, tintColor: Color.Red }
        }
        text={item.isDefault ? "Yes" : "No"}
      />
      {link("Base URL Redirect", item.redirects.baseUrlRedirect)}
      {link("Regular 404 Redirect", item.redirects.regular404Redirect)}
      {link("Invalid Short URL Redirect", item.redirects.invalidShortUrlRedirect)}
    </M>
  );
}

function EditRedirects({ defaultRedirects, domain }: { defaultRedirects: RedirectObject; domain: string }) {
  const { pop } = useNavigation();
  const t = `Default Redirects for "${domain}" Domain`;

  const { itemProps, handleSubmit } = useForm<RedirectObject>({
    initialValues: defaultRedirects,
    onSubmit: async (formData) => {
      const toast = await showToast({
        title: `Updating ${t}...`,
        style: Toast.Style.Animated,
      });

      try {
        const { response, text } = await apiFetch({
          restPath: `domains/redirects`,
          method: "PUT",
          data: JSON.stringify({
            domain: domain,
            baseUrlRedirect: formData.baseUrlRedirect?.trim() || null,
            regular404Redirect: formData.regular404Redirect?.trim() || null,
            invalidShortUrlRedirect: formData.invalidShortUrlRedirect?.trim() || null,
          }),
        });
        if (response.ok) {
          toast.style = Toast.Style.Success;
          toast.title = `${t} Updated!`;
          return pop();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to Update ${t} (${response.statusText})!`;
          toast.message = text;
        }
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to update ${t}!`;
        toast.message = e?.toString();
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {/*<Form.Description text="Domain" title={domain} />*/}
      <Form.TextField
        title="Base URL Redirects"
        {...itemProps.baseUrlRedirect}
        info="URL to redirect to when a user hits the domain's base URL"
      />
      <Form.TextField
        title="Regular 404 Redirect"
        {...itemProps.regular404Redirect}
        info="URL to redirect to when a user hits a not found URL other than an invalid short URL"
      />
      <Form.TextField
        title="Invalid Short URL Redirect"
        {...itemProps.invalidShortUrlRedirect}
        info="URL to redirect to when a user hits an invalid short URL"
      />
    </Form>
  );
}
