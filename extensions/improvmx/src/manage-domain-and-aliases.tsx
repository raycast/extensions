import {
  openExtensionPreferences,
  showToast,
  Detail,
  Toast,
  getPreferenceValues,
  List,
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  launchCommand,
  LaunchType,
} from "@raycast/api";

import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { fetchAccont, domainIcon } from "./utils";

interface Preferences {
  api_token: string;
}

interface Alias {
  forward: string;
  alias: string;
  id: number;
}

interface Domain {
  display: string;
  banned?: boolean;
  active?: boolean;
  aliases: Alias[];
}

interface Alias {
  forward: string;
  alias: string;
  id: number;
}

interface State {
  domains?: Domain[];
  error?: string;
  forwardingEmail?: string;
  isRequireUpgrade: boolean;
  aliasView: boolean;
  aliases: Alias[];
  selectedDomain: string;
  isDomainsLoading: boolean;
}

export default function CreateMaskedEmail() {
  const [state, setState] = useState<State>({
      domains: undefined,
      error: "",
      forwardingEmail: "",
      isRequireUpgrade: false,
      aliasView: false,
      aliases: [],
      selectedDomain: "",
      isDomainsLoading: true,
    }),
    API_TOKEN = getPreferenceValues<Preferences>().api_token,
    API_URL = "https://api.improvmx.com/v3/";

  const auth = Buffer.from("api:" + API_TOKEN).toString("base64");

  useEffect(() => {
    async function getDomains() {
      state.isDomainsLoading = true;

      try {
        const apiResponse = await fetch(API_URL + "domains?=", {
          headers: {
            Authorization: "Basic " + auth,
            "Content-Type": "application/json",
          },
        });

        if (!apiResponse.ok) {
          if (apiResponse.status === 401) {
            setState((prevState) => {
              return { ...prevState, error: "Invalid API Token" };
            });

            return;
          }
        }

        const response = (await apiResponse.json()) as unknown;
        const domains = response as { domains: Array<Domain> };

        setState((prevState) => {
          return { ...prevState, domains: domains.domains, error: "", isDomainsLoading: false };
        });
      } catch (error) {
        (state.error =
          "There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com"),
          (state.isDomainsLoading = false);
        await showToast(Toast.Style.Failure, "ImprovMX Error", "Failed to fetch domains. Please try again later.");
        return;
      }
    }

    async function forwardingEmailFn() {
      const email = await fetchAccont(auth, API_URL);
      setState({ ...state, forwardingEmail: email });
      setState((prevState) => {
        return { ...prevState, forwardingEmail: email };
      });
    }

    getDomains();
    forwardingEmailFn();
  }, []);

  const showError = async () => {
    if (state.error) {
      await showToast(Toast.Style.Failure, "ImprovMX Error", state.error);
    }
  };

  const showAliases = async (domain: Domain) => {
    if (domain.banned || domain.active == false) {
      showToast(Toast.Style.Failure, "Domain not configured properly. Please configure your DNS settings");
      return;
    }

    setState((prevState) => {
      return { ...prevState, aliasView: true, selectedDomain: domain.display };
    });

    try {
      const apiResponse = await fetch(API_URL + "domains/" + domain.display + "/aliases/", {
        headers: {
          Authorization: "Basic " + auth,
          "Content-Type": "application/json",
        },
      });

      if (!apiResponse.ok) {
        setState((prevState) => {
          return { ...prevState, error: "Failed to fetch aliases. Please try again later." };
        });
        return;
      }

      const response = (await apiResponse.json()) as unknown;
      const aliases = response as { aliases: Array<Alias> };

      setState((prevState) => {
        return { ...prevState, aliases: aliases.aliases, error: "" };
      });
    } catch (error) {
      console.log(error);
    }
  };

  showError();

  return state.error ? (
    <Detail
      markdown={state.error}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : !state.aliasView ? (
    <List isLoading={state.isDomainsLoading === true} searchBarPlaceholder="Search for domain...">
      <List.Section title="Active Domains">
        {state.domains
          ?.filter((domain) => domain.active)
          .map((domain: Domain) => (
            <List.Item
              key={domain.display}
              title={domain.display}
              icon={domainIcon(domain)}
              accessories={[{ text: { value: domain.aliases.length.toString() + " aliases" } }]}
              actions={
                <ActionPanel>
                  <Action title="Show Aliases" onAction={() => showAliases(domain)} />
                </ActionPanel>
              }
            />
          ))}
        {state.domains && (
          <List.Item
            title="Add New Domain"
            icon={{ source: Icon.Plus }}
            actions={
              <ActionPanel>
                <Action
                  title="Add new domain"
                  onAction={async () => {
                    await launchCommand({ name: "add-domain", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Inactive Domains">
        {state.domains
          ?.filter((domain) => !domain.active)
          .map((domain: Domain) => (
            <List.Item
              key={domain.display}
              title={domain.display}
              icon={domainIcon(domain)}
              accessories={[{ text: { value: domain.aliases.length.toString() + " aliases" } }]}
              actions={
                <ActionPanel>
                  <Action title="Show Aliases" onAction={() => showAliases(domain)} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  ) : (
    <List isLoading={state.aliases.length === 0} searchBarPlaceholder="Search for alias...">
      <List.Section title="Aliases">
        {state.aliases?.map((alias: Alias) => (
          <List.Item
            key={alias.alias}
            title={alias.alias + "@" + state.selectedDomain}
            accessories={[{ text: { value: alias.forward } }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy alias"
                  onAction={async () => {
                    await Clipboard.copy(alias.alias + "@" + state.selectedDomain);
                    await showToast(Toast.Style.Success, "Copied", "Alias copied to clipboard");
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
        {state.aliases.length !== 0 && (
          <>
            <List.Item
              title="Create New Alias"
              icon={{ source: Icon.Plus }}
              actions={
                <ActionPanel>
                  <Action
                    title="Create new alias"
                    onAction={async () => {
                      await launchCommand({
                        name: "create-alias",
                        type: LaunchType.UserInitiated,
                        arguments: {
                          domain: state.selectedDomain,
                        },
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Create Masked Email Address"
              icon={{ source: Icon.Plus }}
              actions={
                <ActionPanel>
                  <Action
                    title="Create masked email address"
                    onAction={async () => {
                      await launchCommand({
                        name: "create-masked-email-address",
                        type: LaunchType.UserInitiated,
                        arguments: { domain: state.selectedDomain },
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          </>
        )}
      </List.Section>
    </List>
  );
}
