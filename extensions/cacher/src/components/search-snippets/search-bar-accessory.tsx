import { Icon, List } from "@raycast/api";
import { SnippetsResponse } from "../../lib/types/snippets-response";
import { FILTER_ALL, FILTER_PERSONAL_ALL, SNIPPETS_FILTER } from "../../lib/types/snippet-filters";
import { Label } from "../../lib/types/label";
import { labelIcon } from "../../lib/utils/snippet-utils";

function LabelItem({ label }: { label: Label }) {
  return (
    <List.Dropdown.Item key={label.guid} title={label.title} value={`label_${label.guid}`} icon={labelIcon(label)} />
  );
}

interface SearchBarAccessoryProps {
  filter: SNIPPETS_FILTER;
  setFilter: (value: SNIPPETS_FILTER) => void;
  response: SnippetsResponse | undefined;
}

export function SearchBarAccessory({ response, filter, setFilter }: SearchBarAccessoryProps) {
  if (!response) {
    return null;
  }

  const personalLibrary = response.personalLibrary;
  const teams = response.teams;

  return (
    <List.Dropdown tooltip="Filter by Library" value={filter} onChange={(value) => setFilter(value as SNIPPETS_FILTER)}>
      <List.Dropdown.Item title="All Snippets" value={FILTER_ALL} icon={Icon.Code} />
      <List.Dropdown.Section title="Personal">
        <List.Dropdown.Item title="All Personal Snippets" value={FILTER_PERSONAL_ALL} icon={Icon.Person} />
        {personalLibrary.labels.map((label) => (
          <LabelItem label={label} key={label.guid} />
        ))}
      </List.Dropdown.Section>
      {teams.map((team) => (
        <List.Dropdown.Section title={team.name} key={team.guid}>
          <List.Dropdown.Item
            title={`All ${team.name} Snippets`}
            value={`team_all_${team.library.guid}`}
            icon={Icon.Building}
          />
          {team.library.labels.map((label) => (
            <LabelItem label={label} key={label.guid} />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}
