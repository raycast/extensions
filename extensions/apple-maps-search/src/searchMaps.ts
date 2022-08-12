import open from "open";
import { makeSearchURL } from "./utils";

interface SearchQueryArguments {
  query: "string";
}

export default async (props: { arguments: SearchQueryArguments }) => {
  const { query } = props.arguments;
  const searchURL = makeSearchURL(query);
  open(searchURL);
};
