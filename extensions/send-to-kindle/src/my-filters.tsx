import { Alert, Action, ActionPanel, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import AddFilterCommand from "./add-filter";
import FilterForm from "./filter-form";
import { deleteFilter, DomainFilter, listFilters } from "./filters";
import { ExportSkillForm } from "./skill-transfer";

export default function MyFiltersCommand() {
  const [filters, setFilters] = useState<DomainFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadFilters() {
    setIsLoading(true);
    const items = await listFilters();
    setFilters(items);
    setIsLoading(false);
  }

  useEffect(() => {
    loadFilters();
  }, []);

  async function handleDelete(filter: DomainFilter) {
    const confirmed = await confirmAlert({
      title: "Delete this filter?",
      message: `${filter.domain}\n${filter.selector}${filter.coverSelector ? `\nCover CSS: ${filter.coverSelector}` : ""}`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await deleteFilter(filter.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Filter deleted",
    });
    loadFilters();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search domain or filter">
      <List.EmptyView
        title="No skills yet"
        description="Add a skill from the Create Skill command."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add a Skill"
              icon={Icon.Plus}
              target={<AddFilterCommand shouldPop onSaved={loadFilters} />}
            />
          </ActionPanel>
        }
      />
      {filters.map((filter) => (
        <List.Item
          key={filter.id}
          title={filter.domain}
          subtitle={filter.coverSelector ? `${filter.selector} • Cover: ${filter.coverSelector}` : filter.selector}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                target={
                  <FilterForm
                    mode="edit"
                    filterId={filter.id}
                    initialDomain={filter.domain}
                    initialSelector={filter.selector}
                    initialCoverSelector={filter.coverSelector}
                    submitTitle="Update"
                    navigationTitle="Edit filter"
                    onSaved={loadFilters}
                  />
                }
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(filter)}
              />
              <Action.Push
                title="Add a Skill"
                icon={Icon.Plus}
                target={<AddFilterCommand shouldPop onSaved={loadFilters} />}
              />
              <Action.Push
                title="Export Skill JSON"
                icon={Icon.Upload}
                target={
                  <ExportSkillForm
                    filter={{
                      domain: filter.domain,
                      selector: filter.selector,
                      coverSelector: filter.coverSelector,
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
