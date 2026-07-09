import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Companies } from "./api/resources";
import { EditCompanyForm } from "./components/EditCompanyForm";
import CreateCompany from "./create-company";
import { LogOutAction } from "./components/AuthActions";

export default function SearchCompanies() {
  const [industry, setIndustry] = useState<string>("");
  const {
    data: companies,
    isLoading,
    revalidate,
  } = useCachedPromise(
    (ind: string) =>
      ind ? Companies.list({ industry: ind }) : Companies.list(),
    [industry],
    { initialData: [] },
  );

  const industries = Array.from(
    new Set(companies.map((c) => c.industry).filter((x): x is string => !!x)),
  ).sort();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search companies by name…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by industry"
          value={industry}
          onChange={setIndustry}
        >
          <List.Dropdown.Item title="All industries" value="" />
          {industries.map((ind) => (
            <List.Dropdown.Item key={ind} title={ind} value={ind} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No companies"
        icon={Icon.Building}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Company"
              icon={Icon.Plus}
              target={<CreateCompany />}
              onPop={revalidate}
            />
          </ActionPanel>
        }
      />
      {companies.map((company) => (
        <List.Item
          key={company.id}
          icon={{ source: Icon.Building, tintColor: Color.Green }}
          title={company.name}
          subtitle={company.website}
          accessories={[
            company.industry ? { tag: company.industry } : {},
            company.size ? { text: company.size, icon: Icon.TwoPeople } : {},
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Company"
                icon={Icon.Pencil}
                target={
                  <EditCompanyForm company={company} onSaved={revalidate} />
                }
              />
              {company.website && (
                <Action.OpenInBrowser
                  title="Open Website"
                  url={company.website}
                />
              )}
              <ActionPanel.Section>
                <Action.Push
                  title="Create Company"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<CreateCompany />}
                  onPop={revalidate}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
                <LogOutAction />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
