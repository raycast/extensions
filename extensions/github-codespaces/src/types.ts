import { Endpoints } from "@octokit/types";

export type Codespaces = Endpoints["GET /user/codespaces"]["response"]["data"];
export type Machines = Endpoints["GET /repos/{owner}/{repo}/codespaces/machines"]["response"]["data"];
export type Codespace = Codespaces["codespaces"][0];
