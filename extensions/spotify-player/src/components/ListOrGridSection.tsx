import { Grid, List } from "@raycast/api";

type ListOrGridSectionProps = (List.Section.Props | Grid.Section.Props) & {
  type: "list" | "grid";
};
export function ListOrGridSection(props: ListOrGridSectionProps) {
  const { type, ...sectionProps } = props;
  return type === "list" ? (
    <List.Section {...(sectionProps as List.Section.Props)} />
  ) : (
    <Grid.Section {...(sectionProps as Grid.Section.Props)} />
  );
}
