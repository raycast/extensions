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
  LaunchProps,
} from "@raycast/api";

import fetch, { FormData } from "node-fetch";
import { useEffect, useState } from "react";
import { fetchAccont, domainIcon } from "./utils";
import { Account, Domain } from "./types";
import ErrorComponent from "./components/ErrorComponent";
import { useImprovMX, useImprovMXPaginated } from "./hooks";

interface DomainArgs {
  domain: Domain;
}

export default function CreateMaskedEmail(props: LaunchProps<{ arguments?: DomainArgs }>) {

  const propDomain = props.arguments?.domain;
  const DEFAULT_DOMAIN = getPreferenceValues<Preferences.CreateMaskedEmailAddress>().default_domain || propDomain;
  const { isLoading: isFetchingDomains, data: domains, error: domainsError } = useImprovMXPaginated<Domain, "domains">("domains");
  const { isLoading: isFetchingAccount, data: accountData, error: accountError } = useImprovMX<{ account: Account }>("account")

  const handleMaskedEmail = async (domain: Domain) => {
    if (domain.banned || domain.active == false) {
      showToast(Toast.Style.Failure, "Domain not configured properly. Please configure your DNS settings");
      return;
    }

    state.aliasSubmitLoading = true;

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

          state.aliasSubmitLoading = false;

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

      state.aliasSubmitLoading = false;
    } catch (error) {
      setState((prevState) => {
        return { ...prevState, error: "Failed to create masked email. Please try again later." };
      });

      state.aliasSubmitLoading = false;
    }
  };

  const useDefaultDomain = async () => {
    if (
      DEFAULT_DOMAIN && domains.length > 0 &&
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

  const isLoading = isFetchingDomains || isFetchingAccount || isCreating;
  const error = domainsError || accountError || createError;

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search for domain...">
      <List.Section title="Active Domains">
        {domains
          ?.filter((domain) => domain.active)
          .map((domain) => (
            <List.Item
              key={domain.display}
              title={domain.display}
              icon={domainIcon(domain)}
              accessories={[{ text: { value: domain.aliases.length.toString() + " aliases" } }]}
              actions={
                <ActionPanel>
                    <Action title="Create a Masked Email Address" onAction={() => handleMaskedEmail(domain)} />
                    <Action title="Set Default Domain" onAction={openCommandPreferences} />
                  </ActionPanel>
              }
            />
          ))}
      </List.Section>
      <List.Section title="Inactive Domains">
        {domains
          ?.filter((domain) => !domain.active)
          .map((domain) => (
            <List.Item
              key={domain.display}
              title={domain.display}
              icon={domainIcon(domain)}
              actions={(
                  <ActionPanel>
                    <Action title="Create a Masked Email Address" onAction={() => handleMaskedEmail(domain)} />
                    <Action title="Set Default Domain" onAction={openCommandPreferences} />
                  </ActionPanel>
                )
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

// type DomainsListSectionProps = {
//   title: string;
//   domains: Domain[];
// }
// function DomainsListSection({ title, domains }: DomainsListSectionProps) {
//   return <List.Section title={title}>
//         {domains.map((domain) => (
//             <List.Item
//               key={domain.display}
//               title={domain.display}
//               icon={domainIcon(domain)}
//               actions={(
//                   <ActionPanel>
//                     <Action title="Create a Masked Email Address" onAction={() => handleMaskedEmail(domain)} />
//                     <Action title="Set Default Domain" onAction={openCommandPreferences} />
//                   </ActionPanel>
//                 )
//               }
//             />
//           ))}
//       </List.Section>
// }