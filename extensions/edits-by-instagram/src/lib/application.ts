import { getApplications, open, type Application } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export const DOWNLOAD_URL = "https://edits.instagram.com/desktop/";

export async function findEdits(): Promise<Application | undefined> {
  const applications = await getApplications();
  // Verified against Edits 454.0.0's signed application bundle.
  return applications.find((candidate) => candidate.bundleId === "com.burbn.basel.mac");
}

export async function openEdits(application: Application): Promise<void> {
  try {
    await open(application.path);
  } catch {
    await showFailureToast(new Error("Could not open Edits"), {
      title: "Could not open Edits",
      message: "Check that Edits is still installed and try opening it from Applications.",
    });
  }
}
