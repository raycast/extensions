import { AmplifyClient, App, ListAppsCommand } from "@aws-sdk/client-amplify";

/**
 * Lists all Amplify projects (apps) in the current AWS account and region
 * @returns Promise<App[]> Array of Amplify apps
 */
export default async function listAmplifyProjects(): Promise<App[]> {
  const client = new AmplifyClient({});

  const amplifyApps: App[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListAppsCommand({ nextToken });
    const response = await client.send(command);

    if (response.apps) {
      amplifyApps.push(...response.apps);
    }

    nextToken = response.nextToken;
  } while (nextToken);

  return amplifyApps;
}
