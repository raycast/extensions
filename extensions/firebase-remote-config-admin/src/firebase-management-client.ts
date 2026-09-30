import { getGoogleAccessToken } from "./google-auth";

interface FirebaseProjectResponse {
  projectId?: string;
  displayName?: string;
  projectNumber?: string;
  name?: string;
}

interface FirebaseProjectsListResponse {
  results?: FirebaseProjectResponse[];
  nextPageToken?: string;
}

export async function listAccessibleFirebaseProjects(): Promise<
  Array<{ projectId: string; displayName: string }>
> {
  const accessToken = await getGoogleAccessToken();
  const projects: Array<{ projectId: string; displayName: string }> = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(
      `https://firebase.googleapis.com/v1beta1/projects?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        text || `Failed to list Firebase projects (${response.status})`,
      );
    }

    const payload = JSON.parse(text || "{}") as FirebaseProjectsListResponse;
    for (const project of payload.results ?? []) {
      if (!project.projectId) continue;
      projects.push({
        projectId: project.projectId,
        displayName: project.displayName?.trim() || project.projectId,
      });
    }
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return projects.sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
}
