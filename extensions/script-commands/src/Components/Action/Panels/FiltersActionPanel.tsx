import { ActionPanel } from "@raycast/api";

import { useLanguages } from "@hooks";

import { Filter } from "@types";

import { ClearFilterActionItem, LanguagesActionSubmenu, TypeActionSubmenu } from "@components";

type Props = {
  filter: Filter;
  onFilter: (filter: Filter) => void;
};

export function FiltersActionPanel({ filter, onFilter }: Props): JSX.Element {
  const { languages } = useLanguages();

  return (
    <ActionPanel title="Filter by">
      {filter != null && <ClearFilterActionItem onFilter={onFilter} />}
      <TypeActionSubmenu onFilter={onFilter} />
      <LanguagesActionSubmenu languages={languages} onFilter={onFilter} />
    </ActionPanel>
  );
}
