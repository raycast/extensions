import { List } from "@raycast/api";

export default function EmptyList() {
  return (
    <List.EmptyView
      icon={{ source: "vgc.svg" }}
      title="Welcome to Veganify"
      description="Just enter the ingredients you want to check, separated by commas. Veganify will instantly show you the vegan status of each ingredient."
    />
  );
}
