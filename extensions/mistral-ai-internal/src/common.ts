import { Octokit } from "@octokit/rest";
import { QueryClient } from "@tanstack/react-query";
import { getPreferences } from "./preferences";

const { githubToken } = getPreferences();

export const queryClient = new QueryClient();

export const octokit = new Octokit({ auth: githubToken });
