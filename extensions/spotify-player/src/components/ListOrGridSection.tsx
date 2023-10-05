import { Grid, List } from "@raycast/api";

type ListOrGridSectionProps = (List.Section.Props | Grid.Section.Props) & {
  type: "list" | "grid";
};
export function ListOrGridSection<T>(props: ListOrGridSectionProps, context?: T) {
  const { type, ...sectionProps } = props;
  return type === "list"
    ? List.Section(sectionProps as List.Section.Props, context)
    : Grid.Section(sectionProps as Grid.Section.Props, context);
}
