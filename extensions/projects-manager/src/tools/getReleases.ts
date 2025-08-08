import { LocalStorage } from "@raycast/api";
import Release from "../types/release";

type Input = {
  /**
   * The name of the project to get releases for, use the getAllProjects tool to get a list of projects.
   */
  projectName: string;
};

export default async function getReleases(input: Input) {
  const releases = await LocalStorage.getItem<string>("releases");
  const allReleases: Release[] = releases ? JSON.parse(releases) : [];
  return allReleases.filter((release) => release.projectID === input.projectName);
}
