import { LocalStorage } from "@raycast/api";
import Release from "../types/release";

type Input = {
  /**
   * The name of the project to get releases for, use the getAllProjects tool to get a list of projects.
   */
  projectID: string;
  /**
   * The type of release to create if not provided defaults to patch
   */
  releaseType: "major" | "minor" | "patch";

  /**
   * The version of the release to create, defaults to 1.0.0 if not provided
   */
  version: string;
};

export default async function createRelease(input: Input) {
  const releases = await LocalStorage.getItem<string>("releases");
  const allReleases: Release[] = releases ? JSON.parse(releases) : [];
  const newRelease = { ...input, id: allReleases.length + 1, date: new Date().toISOString(), released: false };
  allReleases.push(newRelease);
  await LocalStorage.setItem("releases", JSON.stringify(allReleases));
  return newRelease;
}
