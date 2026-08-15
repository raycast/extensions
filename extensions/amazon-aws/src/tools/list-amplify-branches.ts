import { AmplifyClient, ListBranchesCommand, Branch } from "@aws-sdk/client-amplify";

/**
 * Lists all branches for a specific Amplify app
 * @param options - Configuration options
 * @returns Promise<Branch[]> Array of branches for the app
 */
export default async function listAmplifyBranches(options: { appId: string }): Promise<Branch[]> {
  const { appId } = options;

  if (!appId) {
    throw new Error("App ID is required");
  }

  const client = new AmplifyClient({});

  const branches: Branch[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListBranchesCommand({ appId, nextToken });
    const response = await client.send(command);

    if (response.branches) {
      branches.push(...response.branches);
    }

    nextToken = response.nextToken;
  } while (nextToken);

  return branches;
}
