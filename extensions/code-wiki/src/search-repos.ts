import { type LaunchProps, open } from "@raycast/api";

type SearchReposArguments = {
  query: string;
};

export default async function Command(props: LaunchProps<{ arguments: SearchReposArguments }>) {
  const { query } = props.arguments;
  const url = `https://codewiki.google/search?q=${wencodeURIComponent(query)}`;
  await open(url);
}
