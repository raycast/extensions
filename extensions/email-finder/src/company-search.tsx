import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useCompanySearch } from "./hooks/useCompanySearch";
import { CompanySearchResult } from "./backend";
import { EmailFormView } from "./email-finder";

// * Props for callback-based navigation (used by company-employees)
interface CompanySearchProps {
  onSelectCompany: (company: CompanySearchResult) => void;
  onEnterManually: () => void;
  signOut: () => Promise<void>;
}

// * Props for Action.Push-based navigation (used by email-finder)
interface EmailFinderCompanySearchProps {
  signOut: () => Promise<void>;
}

function getConfidenceColor(score: number): Color {
  if (score >= 80) return Color.Green;
  if (score >= 50) return Color.Yellow;
  return Color.Red;
}

export function CompanySearch({ onSelectCompany, onEnterManually, signOut }: CompanySearchProps) {
  const [searchText, setSearchText] = useState("");
  const { results, isLoading } = useCompanySearch(searchText);

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
              <Action title="Enter Domain Manually" icon={Icon.Pencil} onAction={onEnterManually} />
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
              <Action title="Enter Domain Manually" icon={Icon.Pencil} onAction={onEnterManually} />
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
                  <Action title="Select Company" icon={Icon.Check} onAction={() => onSelectCompany(company)} />
                  <Action title="Enter Domain Manually" icon={Icon.Pencil} onAction={onEnterManually} />
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

// * Email Finder variant using Action.Push for navigation
export function EmailFinderCompanySearch({ signOut }: EmailFinderCompanySearchProps) {
  const [searchText, setSearchText] = useState("");
  const { results, isLoading } = useCompanySearch(searchText);

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
              <Action.Push
                title="Enter Domain Manually"
                icon={Icon.Pencil}
                target={<EmailFormView signOut={signOut} />}
              />
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
              <Action.Push
                title="Enter Domain Manually"
                icon={Icon.Pencil}
                target={<EmailFormView signOut={signOut} />}
              />
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
                  <Action.Push
                    title="Select Company"
                    icon={Icon.Check}
                    target={<EmailFormView signOut={signOut} initialDomain={company.domain} />}
                  />
                  <Action.Push
                    title="Enter Domain Manually"
                    icon={Icon.Pencil}
                    target={<EmailFormView signOut={signOut} />}
                  />
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
