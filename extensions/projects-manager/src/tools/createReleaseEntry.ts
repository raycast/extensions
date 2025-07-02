import { LocalStorage } from "@raycast/api";
import ReleaseEntry from "../types/releaseEntry";
import Release from "../types/release";
import getReleases from "./getReleases";
import createRelease from "./createRelease";
import ProjectSettings from "../types/projectSettings";

type Input = {
  /**
   * The name of the project to get releases for, use the getAllProjects tool to get a list of projects.
   */
  projectID: string;
  /**
   * The type of entry to create if not provided defaults to addition
   */
  entryType: "addition" | "improvement" | "bug-fix";
  /**
   * The description of the addition, improvement or bug fix
   */
  description: string;
};

export default async function createReleaseEntry(input: Input) {
  const releases = ((await getReleases({ projectName: input.projectID })) as Release[]).sort((a, b) => b.id - a.id);
  if (releases.length === 0) {
    const projectSettings = JSON.parse(
      (await LocalStorage.getItem<string>("projectSettings")) || "[]",
    ) as ProjectSettings[];
    const projectSetting = projectSettings.find((p) => p.projectID === input.projectID);
    const newRelease = await createRelease({
      projectID: input.projectID,
      releaseType: "patch",
      version: projectSetting?.initialVersion || "1.0.0",
    });
    releases.push(newRelease);
  } else {
    if (releases[0].released) {
      const newRelease = await createRelease({ projectID: input.projectID, releaseType: "patch", version: "1.0.0" });
      releases.push(newRelease);
    }
  }
  const latestRelease = releases[0];
  const releaseEntries = await LocalStorage.getItem<string>("releaseEntries");
  const allReleaseEntries: ReleaseEntry[] = releaseEntries ? JSON.parse(releaseEntries) : [];
  const entryTypeMap: Record<string, string> = {
    addition: "Addition",
    improvement: "Improvement",
    "bug-fix": "Bug Fix",
  };

  const newReleaseEntry = {
    id: allReleaseEntries.length + 1,
    projectID: input.projectID,
    releaseID: latestRelease.id,
    type: input.entryType,
    entryType: entryTypeMap[input.entryType],
    description: input.description,
  };
  allReleaseEntries.push(newReleaseEntry);
  await LocalStorage.setItem("releaseEntries", JSON.stringify(allReleaseEntries));
  return newReleaseEntry;
}
