import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { GithubArtifactRoot, GithubBranchDetails } from "./githubTypes";

export async function listArtifacts() {
  const preferences: Preferences = getPreferenceValues();
  const githubToken = preferences.githubToken;
  const url = "https://api.github.com/repos/Norsk-Tipping/nt-android/actions/artifacts"

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: "application/vnd.github.v3+json"
    }
  })

  console.log("RESPONSE STATUS")
  console.log(response.status)

  const artifacts = (await response.json()) as GithubArtifactRoot
  console.log(artifacts)
  return artifacts.artifacts
    .filter((a) => a.name.endsWith(".apk"))
    .filter((a) => a.expired == false);
}

export async function listBranches() {
  const preferences: Preferences = getPreferenceValues();
  const githubToken = preferences.githubToken;
  let page = 0
  const url = `https://api.github.com/repos/Norsk-Tipping/nt-android/branches?page=${page}&per_page=10`
  const allBranches: GithubBranchDetails[] = []
  let someBranches: GithubBranchDetails[] = []

  do {
    console.log(`Getting branch page ${page}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    console.log("RESPONSE STATUS");
    console.log(response.status);

    someBranches = (await response.json()) as GithubBranchDetails[];
    someBranches.forEach((b) => { allBranches.push(b) });
    page++;
  } while (someBranches.length != 0)


  console.log(`Here are all branches: ${allBranches}`);
  return allBranches;
}