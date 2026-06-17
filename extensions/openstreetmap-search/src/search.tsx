import { makeSearchURL } from "./utils";
import { exec } from "child_process";
import { SearchQueryArguments } from "./interfaces";

export default async (props: { arguments: SearchQueryArguments }) => {
  const { query } = props.arguments;
  exec(`/usr/bin/open '${makeSearchURL(query)}'`);
};
