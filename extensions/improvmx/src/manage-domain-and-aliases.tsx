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

interface Domain {
  display: string;
  banned?: boolean;
  active?: boolean;
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
}

export default function CreateMaskedEmail() {
  const [state, setState] = useState<State>({
      domains: undefined,
      error: "",
      forwardingEmail: "",
      isRequireUpgrade: false,
      aliasView: false,
      aliases: [],
    }),
    API_TOKEN = getPreferenceValues<Preferences>().api_token,
    API_URL = "https://api.improvmx.com/v3/";

  const auth = Buffer.from("api:" + API_TOKEN).toString("base64");

  useEffect(() => {
    async function getDomains() {
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
          return { ...prevState, domains: domains.domains, error: "" };
        });
      } catch (error) {
        setState((prevState) => {
          return { ...prevState, error: "Failed to fetch domains. Please try again later." };
        });
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
      showToast(Toast.Style.Failure, "Invalid Domain", "Domain is banned or inactive");
      return;
    }

    setState((prevState) => {
      return { ...prevState, aliasView: true };
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
      markdown="There was an error with your API Token. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : !state.aliasView ? (
    <List isLoading={state.domains === undefined} searchBarPlaceholder="Search for domain...">
      <List.Section title="Domains">
        {state.domains?.map((domain: Domain) => (
          <List.Item
            key={domain.display}
            title={domain.display}
            icon={domainIcon(domain)}
            actions={
              <ActionPanel>
                <Action title="Show Aliases" onAction={() => showAliases(domain)} />
              </ActionPanel>
            }
            // detail={<List.Item.Detail markdown={"Domain: **" + domain.display + "**"} />}
          />
        ))}
        {state.domains && (
          <List.Item
            title="Create New Domain"
            icon={{ source: Icon.Plus }}
            actions={
              <ActionPanel>
                <Action
                  title="Create new domain"
                  onAction={async () => {
                    await launchCommand({ name: "add-domain", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  ) : (
    <List isLoading={state.aliases === undefined} searchBarPlaceholder="Search for aliases...">
      <List.Section title="Aliases">
        {state.aliases?.map((alias: Alias) => (
          <List.Item
            key={alias.alias}
            title={alias.alias}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Forwarding Email"
                  onAction={async () => {
                    await Clipboard.copy(alias.forward);
                    await showToast(Toast.Style.Success, "Copied", "Copied forwarding email to clipboard");
                  }}
                />
              </ActionPanel>
            }
            // detail={<List.Item.Detail markdown={"Forwarding email: **" + alias.forward + "**"} />}
          />
        ))}
        {state.aliases !== undefined && (
          <List.Item
            title="Create New Alias"
            icon={{ source: Icon.Plus }}
            actions={
              <ActionPanel>
                <Action
                  title="Create new alias"
                  onAction={async () => {
                    await launchCommand({ name: "create-alias", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
