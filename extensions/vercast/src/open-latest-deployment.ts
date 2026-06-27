import { getPreferenceValues, LocalStorage, open, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { fetchLatestDeployment, fetchTeams, fetchUser, getDeploymentURL } from "./vercel";
import isValidToken from "./utils/is-valid-token";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Loading latest deployment...",
  });

  try {
    await isValidToken();
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "Invalid token";
    toast.message = "Please set a valid Vercel access token in the settings.";
    toast.primaryAction = {
      title: "Open Settings",
      onAction: () => openCommandPreferences(),
    };
    return;
  }

  // Get the selected team from local storage
  const selectedTeamId = await LocalStorage.getItem<string>("selectedTeamId");

  // Fetch user and teams in parallel
  const [user, teams] = await Promise.all([fetchUser(), fetchTeams()]);

  // Validate that the selected team still exists
  let validTeamId = selectedTeamId;
  const team = selectedTeamId ? teams.find((team) => team.id === selectedTeamId) : undefined;
  if (selectedTeamId) {
    if (!team) {
      await LocalStorage.removeItem("selectedTeamId");
      validTeamId = undefined;
    }
  }

  // Fetch the latest deployment
  const deployment = await fetchLatestDeployment(validTeamId, team?.slug);

  if (!deployment) {
    toast.style = Toast.Style.Failure;
    toast.title = "No deployments found";
    toast.message = validTeamId ? "No deployments found for the selected team." : "No deployments found.";
    return;
  }

  const { openTarget } = getPreferenceValues<Preferences.OpenLatestDeployment>();

  let url: string;
  switch (openTarget) {
    case "deployUrl":
      url = `https://${deployment.url}`;
      break;
    case "vercel": {
      const slugOrUsername = team?.slug || user.username;

      // @ts-expect-error Property id does not exist on type Deployment (but it does in practice)
      const deploymentId = deployment.id || deployment.uid;
      url = getDeploymentURL(slugOrUsername, deployment.name, deploymentId);
      break;
    }
    default: {
      const unhandledTarget: never = openTarget;
      throw new Error(`Unhandled open target: ${String(unhandledTarget)}`);
    }
  }

  toast.style = Toast.Style.Success;
  toast.title = "Opening deployment";
  toast.message = deployment.name;

  await open(url);
}
