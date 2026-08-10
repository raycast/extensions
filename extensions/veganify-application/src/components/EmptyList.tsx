import { List } from "@raycast/api";

export default function EmptyList({ searchText }: { searchText: string }) {
  return (
    <List.EmptyView
      icon={"vgc.svg"}
      title={searchText.trim() === "" ? "Welcome to Veganify" : "Loading..."}
      description="Just enter the ingredients you want to check, separated by commas. Veganify will instantly show you the vegan status of each ingredient."
    />
  );
}
