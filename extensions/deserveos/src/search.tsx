import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import {
  type CompanyRecord,
  type OpportunityRecord,
  type PersonRecord,
  searchCompanies,
  searchOpportunities,
  searchPeople,
} from "./lib/api";
import { AuthError } from "./lib/oauth";
import { formatMoney, formatStage, stageColor } from "./lib/format";
import { LoginPromptList } from "./lib/login-prompt";
import { getWorkspaceUrl } from "./lib/preferences";

const personName = (person: PersonRecord): string => {
  const name = [person.name?.firstName, person.name?.lastName].filter(Boolean).join(" ");
  return name || person.emails?.primaryEmail || "Unnamed person";
};

const recordUrl = (objectNameSingular: string, id: string) => `${getWorkspaceUrl()}/object/${objectNameSingular}/${id}`;

type SearchResults = {
  people: PersonRecord[];
  companies: CompanyRecord[];
  opportunities: OpportunityRecord[];
};

const EMPTY: SearchResults = { people: [], companies: [], opportunities: [] };

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error } = usePromise(
    async (text: string): Promise<SearchResults> => {
      const trimmed = text.trim();
      if (trimmed.length < 2) return EMPTY;

      const [people, companies, opportunities] = await Promise.all([
        searchPeople(trimmed),
        searchCompanies(trimmed),
        searchOpportunities(trimmed),
      ]);
      return { people, companies, opportunities };
    },
    [searchText],
  );

  if (error instanceof AuthError) {
    return <LoginPromptList />;
  }

  const results = data ?? EMPTY;
  const isEmpty = results.people.length === 0 && results.companies.length === 0 && results.opportunities.length === 0;

  return (
    <List
      isLoading={isLoading}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search people, companies and deals…"
    >
      {searchText.trim().length < 2 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Search your CRM" description="Type at least 2 characters." />
      ) : (
        isEmpty &&
        !isLoading && <List.EmptyView icon={Icon.MagnifyingGlass} title={`No results for "${searchText.trim()}"`} />
      )}

      <List.Section
        title="Deals"
        subtitle={results.opportunities.length ? `${results.opportunities.length}` : undefined}
      >
        {results.opportunities.map((deal) => {
          const amount = formatMoney(deal.amount?.amountMicros, deal.amount?.currencyCode);
          return (
            <List.Item
              key={deal.id}
              icon={{
                source: Icon.BankNote,
                tintColor: stageColor(deal.stage),
              }}
              title={deal.name ?? "Untitled deal"}
              subtitle={deal.company?.name ?? undefined}
              accessories={[
                ...(amount ? [{ text: amount }] : []),
                {
                  tag: {
                    value: formatStage(deal.stage),
                    color: stageColor(deal.stage),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Deserveos" url={recordUrl("opportunity", deal.id)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="People" subtitle={results.people.length ? `${results.people.length}` : undefined}>
        {results.people.map((person) => (
          <List.Item
            key={person.id}
            icon={Icon.Person}
            title={personName(person)}
            subtitle={person.jobTitle ?? undefined}
            accessories={[
              ...(person.company?.name ? [{ text: person.company.name }] : []),
              ...(person.emails?.primaryEmail ? [{ icon: Icon.Envelope, tooltip: person.emails.primaryEmail }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Deserveos" url={recordUrl("person", person.id)} />
                {person.emails?.primaryEmail && (
                  <Action.CopyToClipboard title="Copy Email" content={person.emails.primaryEmail} />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Companies" subtitle={results.companies.length ? `${results.companies.length}` : undefined}>
        {results.companies.map((company) => (
          <List.Item
            key={company.id}
            icon={Icon.Building}
            title={company.name ?? "Unnamed company"}
            subtitle={company.domainName?.primaryLinkUrl ?? undefined}
            accessories={company.employees ? [{ text: `${company.employees} employees` }] : []}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Deserveos" url={recordUrl("company", company.id)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
