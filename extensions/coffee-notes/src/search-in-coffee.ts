import { LaunchProps } from "@raycast/api";
import { runCoffee } from "./coffee";

export default async function SearchInCoffee(props: LaunchProps<{ arguments: Arguments.SearchInCoffee }>) {
  await runCoffee("search", { q: props.arguments.query.trim() });
}
