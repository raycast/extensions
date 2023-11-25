import { Endpoints } from "@octokit/types";
import { useInsiders } from "./preferences";

export type Codespaces = Endpoints["GET /user/codespaces"]["response"]["data"];
export type Machines =
  Endpoints["GET /repos/{owner}/{repo}/codespaces/machines"]["response"]["data"];
export type Codespace = Codespaces["codespaces"][0];
export type Machine = Machines["machines"][0];

export type Client = "vscode" | "web" | "ssh";

export const clientNames: {
  [key in Client]: string;
} = {
  vscode: useInsiders ? "Visual Studio Code Insiders" : "Visual Studio Code",
  web: "web client",
  ssh: "SSH",
};
