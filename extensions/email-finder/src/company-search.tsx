import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useCompanySearch } from "./hooks/useCompanySearch";
import type { CompanySearchResult } from "./api/clearout-client";

interface CompanySearchProps {
  signOut: () => Promise<void>;
  renderSelectAction: (company: CompanySearchResult) => React.ReactNode;
  renderManualAction: () => React.ReactNode;
}

function getConfidenceColor(score: number): Color {
  if (score >= 80) return Color.Green;
  if (score >= 50) return Color.Yellow;
  return Color.Red;
}

export function CompanySearch({ signOut, renderSelectAction, renderManualAction }: CompanySearchProps) {
  const [searchText, setSearchText] = useState("");
  const { results, isLoading, error } = useCompanySearch(searchText);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle={true}
      filtering={false}
      searchBarPlaceholder="Search for a company..."
    >
      {searchText.length < 2 ? (
        <List.EmptyView
          title="Type a Company Name"
          description="Type at least 2 characters to search for a company domain..."
          icon={Icon.Building}
          actions={
            <ActionPanel>
              {renderManualAction()}
              <Action title="Sign out" icon={Icon.Logout} onAction={signOut} />
            </ActionPanel>
          }
        />
      ) : error && !isLoading ? (
        <List.EmptyView
          title="Search Failed"
          description={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              {renderManualAction()}
              <Action title="Sign out" icon={Icon.Logout} onAction={signOut} />
            </ActionPanel>
          }
        />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Companies Found"
          description={`No results for "${searchText}". Try a different search or enter manually.`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              {renderManualAction()}
              <Action title="Sign out" icon={Icon.Logout} onAction={signOut} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Companies" subtitle={`${results.length} results`}>
          {results.map((company, index) => (
            <List.Item
              key={`${company.domain}-${index}`}
              icon={company.logo_url ? { source: company.logo_url, fallback: Icon.Building } : Icon.Building}
              title={company.name}
              subtitle={company.domain}
              accessories={[
                {
                  tag: {
                    value: `${company.confidence_score}%`,
                    color: getConfidenceColor(company.confidence_score),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  {renderSelectAction(company)}
                  {renderManualAction()}
                  <Action title="Sign out" icon={Icon.Logout} onAction={signOut} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
