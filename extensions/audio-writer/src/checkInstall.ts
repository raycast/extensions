import { getApplications } from "@raycast/api";

export async function isAudioWriterInstalled() {
  const applications = await getApplications();

  return applications.some(({ bundleId }) => bundleId === "com.pradeepb28.Audio-Writer");
}
