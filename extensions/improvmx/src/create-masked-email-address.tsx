import {
  showHUD,
  openExtensionPreferences,
  showToast,
  Detail,
  Toast,
  getPreferenceValues,
  List,
  openCommandPreferences,
  Action,
  ActionPanel,
  Clipboard,
  popToRoot,
} from "@raycast/api";

import fetch, { FormData } from "node-fetch";
import { useEffect, useState } from "react";
import { fetchAccont, domainIcon } from "./utils";

interface Preferences {
  api_token: string;
  default_domain: string;
}

interface Domain {
  display: string;
  banned?: boolean;
  active?: boolean;
}

interface State {
  domains?: Domain[];
  error?: string;
  forwardingEmail?: string;
  isRequireUpgrade: boolean;
}

export default function CreateMaskedEmail() {
  const [state, setState] = useState<State>({
      domains: undefined,
      error: "",
      forwardingEmail: "",
      isRequireUpgrade: false,
    }),
    API_TOKEN = getPreferenceValues<Preferences>().api_token,
    DEFAULT_DOMAIN = getPreferenceValues<Preferences>().default_domain,
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

  const handleMaskedEmail = async (domain: Domain) => {
    if (domain.banned || domain.active == false) {
      showToast(Toast.Style.Failure, "Invalid Domain", "Domain is banned or inactive");
      return;
    }

    const form = new FormData();
    form.append("alias", Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    form.append("forward", state.forwardingEmail);

    try {
      const response = await fetch(API_URL + `domains/${domain.display}/aliases/`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + auth,
        },
        body: form,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setState((prevState) => {
            return { ...prevState, error: "Invalid API Token" };
          });

          return;
        }

        const apiErrors = (await response.json()) as { error?: string; errors?: Record<string, string[]> };

        if (apiErrors.errors) {
          const errorToShow = Object.values(apiErrors.errors).flat();

          showToast(Toast.Style.Failure, "ImprovMX Error", errorToShow[0]);

          if (errorToShow[0].startsWith("Your account is limited to")) {
            setState((prevState) => {
              return { ...prevState, isRequireUpgrade: true };
            });
          }

          return;
        }

        return;
      }

      const data = (await response.json()) as { alias: { alias: string } };
      await Clipboard.copy(data.alias.alias + "@" + domain.display);
      await showHUD(
        "Masked email created successfully " + data.alias.alias + "@" + domain.display + " and copied to clipboard"
      );
      await showToast(
        Toast.Style.Success,
        "Masked email created successfully",
        data.alias.alias + "@" + domain.display
      );
      await popToRoot({
        clearSearchBar: true,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const useDefaultDomain = async () => {
    if (
      DEFAULT_DOMAIN &&
      state.domains !== undefined &&
      state.domains.length > 0 &&
      state.forwardingEmail !== undefined &&
      state.forwardingEmail !== ""
    ) {
      const domain = state.domains?.find((domain) => domain.display === DEFAULT_DOMAIN);
      if (domain) {
        await handleMaskedEmail(domain);
      } else {
        showToast(
          Toast.Style.Failure,
          "Invalid Domain",
          "Your default domain is invalid. Please update it from this command preferences"
        );
      }
    }
  };

  useDefaultDomain();

  const upgradeAction = (
    <ActionPanel>
      <Action.OpenInBrowser url="https://app.improvmx.com/account/payment" title="Upgrade Account" />
    </ActionPanel>
  );

  showError();

  return DEFAULT_DOMAIN ? (
    <Detail
      markdown={`We are using your default domain [${DEFAULT_DOMAIN}](${DEFAULT_DOMAIN}) to create masked email. You can change your default domain in your Extension Preferences.`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  ) : state.error ? (
    <Detail
      markdown="There was an error with your API Token. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : (
    <List isLoading={state.domains === undefined} searchBarPlaceholder="Search for domain..." isShowingDetail>
      <List.Section title="Domains">
        {state.domains?.map((domain: Domain) => (
          <List.Item
            key={domain.display}
            title={domain.display}
            icon={domainIcon(domain)}
            actions={
              state.isRequireUpgrade ? (
                upgradeAction
              ) : (
                <ActionPanel>
                  <Action title="Create a Masked Email Address" onAction={() => handleMaskedEmail(domain)} />
                  <Action title="Set default domain " onAction={openCommandPreferences} />
                </ActionPanel>
              )
            }
            // detail={<List.Item.Detail markdown={"Create masked email using **" + domain.display + "**"} />}
          />
        ))}
      </List.Section>
    </List>
  );
}
