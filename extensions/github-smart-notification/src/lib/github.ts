import { exec } from "child_process";
import { promisify } from "util";
import { ghCommandPath } from "./preference";

const execAsync = promisify(exec);
export const toHtmlUrl = async (url: string) => {
  return (await execAsync(`${ghCommandPath} api ${url} --jq '.html_url'`)).stdout;
};
