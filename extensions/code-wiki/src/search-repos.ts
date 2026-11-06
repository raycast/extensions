import { type LaunchProps, open } from "@raycast/api";
import { repoSearchURL } from "./lib/code-wiki-url";

type SearchReposArguments = {
  query: string;
};

export default async function Command(props: LaunchProps<{ arguments: SearchReposArguments }>) {
  const { query } = props.arguments;
  await open(repoSearchURL(query));
}
