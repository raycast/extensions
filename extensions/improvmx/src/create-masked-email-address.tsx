import {
  showHUD,
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

import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { domainIcon, generateAlias, parseImprovMXResponse } from "./utils";
import { Account, Alias, Domain } from "./types";
import ErrorComponent from "./components/ErrorComponent";
import { useImprovMX, useImprovMXPaginated } from "./hooks";
import { showFailureToast } from "@raycast/utils";
import { API_HEADERS, API_URL } from "./constants";

interface DomainArgs {
  domain: Domain;
}

export default function CreateMaskedEmail(props: LaunchProps<{ arguments?: DomainArgs }>) {
  const [createError, setCreateError] = useState<Error>();
  const [isCreating, setIsCreating] = useState(false);

  const propDomain = props.arguments?.domain;
  const DEFAULT_DOMAIN = getPreferenceValues<Preferences.CreateMaskedEmailAddress>().default_domain || propDomain;
  const {
    isLoading: isFetchingDomains,
    data: domains,
    error: domainsError,
  } = useImprovMXPaginated<Domain, "domains">("domains");
  const {
    isLoading: isFetchingAccount,
    data: accountData,
    error: accountError,
  } = useImprovMX<{ account: Account }>("account");
  const forwardingEmail = accountData?.account.email || "";

  const handleMaskedEmail = async (domain: Domain) => {
    try {
      setIsCreating(true);
      if (domain.banned || domain.active == false) {
        showToast(Toast.Style.Failure, "Domain not configured properly. Please configure your DNS settings");
        return;
      }

      const response = await fetch(API_URL + `domains/${domain.display}/aliases`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          alias: generateAlias(),
          forward: forwardingEmail,
        }),
      });
      // @ts-expect-error Response type is incompatible
      const result = await parseImprovMXResponse<{ alias: Alias }>(response, { pagination: false });

      const { alias } = result.data.alias;
      const aliasEmail = alias + "@" + domain.display;
      await Clipboard.copy(aliasEmail);
      await showHUD("Masked email created successfully " + aliasEmail + " and copied to clipboard");
      await showToast(Toast.Style.Success, "Masked email created successfully", aliasEmail);
      await popToRoot({
        clearSearchBar: true,
      });
    } catch (error) {
      await showFailureToast(error, { title: "ImprovMX Error" });
      setCreateError(error as Error);
    } finally {
      setIsCreating(false);
    }
  };

  const useDefaultDomain = async () => {
    if (DEFAULT_DOMAIN && domains.length > 0 && forwardingEmail) {
      const domain = domains.find((domain) => domain.display === DEFAULT_DOMAIN);
      if (domain) {
        await handleMaskedEmail(domain);
      } else {
        const error: Error = {
          name: "",
          message: "Your default domain is invalid. Please update it from this command's preferences",
        };
        await showFailureToast(error.message);
        setCreateError(error);
      }
    }
  };

  useEffect(() => {
    useDefaultDomain();
  }, []);

  const isLoading = isFetchingDomains || isFetchingAccount || isCreating;
  const error = domainsError || accountError || createError;

  return error ? (
    <ErrorComponent error={error} />
  ) : DEFAULT_DOMAIN ? (
    <Detail
      isLoading={isLoading}
      markdown={`We are using your domain [${DEFAULT_DOMAIN}](${DEFAULT_DOMAIN}) to create masked email. You can change your default domain in your Extension Preferences.`}
    />
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
              actions={
                <ActionPanel>
                  <Action title="Create a Masked Email Address" onAction={() => handleMaskedEmail(domain)} />
                  <Action title="Set Default Domain" onAction={openCommandPreferences} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
