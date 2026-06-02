import { Grid, List } from "@raycast/api";
import { CATEGORY_SECTIONS } from "./categories";

interface CategoryDropdownProps {
  categoryId: string;
  onChange: (value: string) => void;
}

function CategoryItems({
  DropdownItem,
  DropdownSection,
}: {
  DropdownItem: typeof List.Dropdown.Item;
  DropdownSection: typeof List.Dropdown.Section;
}) {
  return (
    <>
      {CATEGORY_SECTIONS.map((section) =>
        section.title === "Wszystkie" ? (
          section.items.map((cat) => (
            <DropdownItem key={cat.id} title={cat.name} value={cat.id} />
          ))
        ) : (
          <DropdownSection key={section.title} title={section.title}>
            {section.items.map((cat) => (
              <DropdownItem key={cat.id} title={cat.name} value={cat.id} />
            ))}
          </DropdownSection>
        ),
      )}
    </>
  );
}

export function ListCategoryDropdown({
  categoryId,
  onChange,
}: CategoryDropdownProps) {
  return (
    <List.Dropdown tooltip="Kategoria" onChange={onChange} value={categoryId}>
      <CategoryItems
        DropdownItem={List.Dropdown.Item}
        DropdownSection={List.Dropdown.Section}
      />
    </List.Dropdown>
  );
}

export function GridCategoryDropdown({
  categoryId,
  onChange,
}: CategoryDropdownProps) {
  return (
    <Grid.Dropdown tooltip="Kategoria" onChange={onChange} value={categoryId}>
      <CategoryItems
        DropdownItem={Grid.Dropdown.Item}
        DropdownSection={Grid.Dropdown.Section}
      />
    </Grid.Dropdown>
  );
}
