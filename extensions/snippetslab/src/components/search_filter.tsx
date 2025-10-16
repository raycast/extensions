import { List } from "@raycast/api";
import { getPreferences } from "../models/preferences";
import type { CLIFilter, CLIListFiltersResponse } from "../models/response";

interface SearchFilterDropdownProps {
    filters?: CLIListFiltersResponse;

    /**
     * Callback for when the dropdown selection changes.
     *
     * @param newValue The value takes the format of `<type>:<id>`, where `type` is the type of the
     * filter (e.g., `folder`, `tag`, `language`) and `id` is the unique identifier. These values
     * can be passed to the cli in the form of `--type id`.
     *
     * Note that although the CLI supports multiple filters, only one can be selected with the UI.
     */
    onChange: (newValue: string) => void;
}

/** Dropdown for all available search filters (folders, tags, languages). */
export function SearchFilterDropdown({ filters, onChange }: SearchFilterDropdownProps) {
    const persist = getPreferences().persistSearchFilter;

    if (!filters) {
        return null;
    }

    return (
        <List.Dropdown
            tooltip="Search filters"
            storeValue={persist}
            onChange={(newValue) => onChange(newValue)}
        >
            <>
                <List.Dropdown.Item title="All Snippets" value="" />
                <List.Dropdown.Section title="Folders">
                    {filters.folders.map((filter: CLIFilter) => (
                        <List.Dropdown.Item
                            key={filter.id}
                            title={filter.name}
                            value={`folder:${filter.id}`}
                        />
                    ))}
                </List.Dropdown.Section>
                <List.Dropdown.Section title="Tags">
                    {filters.tags.map((filter: CLIFilter) => (
                        <List.Dropdown.Item
                            key={filter.id}
                            title={filter.name}
                            value={`tag:${filter.id}`}
                        />
                    ))}
                </List.Dropdown.Section>
                <List.Dropdown.Section title="Languages">
                    {filters.languages.map((filter: CLIFilter) => (
                        <List.Dropdown.Item
                            key={filter.id}
                            title={filter.name}
                            value={`language:${filter.id}`}
                        />
                    ))}
                </List.Dropdown.Section>
            </>
        </List.Dropdown>
    );
}
