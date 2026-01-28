import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";

export type Application = {
  id: string;
  name: string;
  state: "DEPLOYED" | "SUSPENDED" | "DESTROYED";
  hostname?: string;
  createdAt: string;
  currentRelease?: {
    imageRef: string;
    createdAt: string;
    status: string;
  };
  vmSize: {
    name: string;
    memoryMb: number;
    memoryGb: number;
  };
  autoscaling?: {
    enabled: boolean;
    strategy: string;
    minCount: number;
    maxCount: number;
  };
  organization: {
    name: string;
  };
  regions?: { code: string }[];
  machines?: {
    nodes: {
      id: string;
      state: string;
      region: string;
    }[];
  };
  ipAddresses?: {
    nodes: {
      type: string;
      address: string;
    }[];
  };
  volumes?: {
    nodes: {
      sizeGb: number;
      state: string;
      status: string;
      name: string;
      region: string;
    }[];
  };
};

export function useApplications() {
  type Response = {
    data: {
      apps: {
        nodes: Application[];
      };
    };
  };

  return useGraphQL<Response>(`
    query {
      apps {
        nodes {
          id
          name
          state
          hostname
          createdAt
          vmSize {
            name
            memoryMb
            memoryGb
          }
          autoscaling {
            enabled
            strategy
            minCount
            maxCount
          }
          currentRelease {
            imageRef
            createdAt
            status
          }
          ipAddresses {
            nodes {
              address
              type
            }
          }
          machines(active: true) {
            nodes {
              id
              state
              region
            }
          }
          regions {
            code
          }
          volumes {
            nodes {
              sizeGb
              state
              status
              name
              region
            }
          }
          organization {
            name
            type
          }
        }
      }
    }
  `);
}

function useGraphQL<Response>(query: string) {
  const { authToken } = getPreferenceValues();

  return useFetch<Response>("https://api.fly.io/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
}

export async function restartMachine(appName: string, machineId: string) {
  const { authToken } = getPreferenceValues();

  const { status } = await fetch(`https://api.machines.dev/v1/apps/${appName}/machines/${machineId}/restart`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (status !== 200) {
    throw new Error(`Failed to restart machine ${machineId}`);
  }
}

export function isAuthenticationError(data: unknown): boolean {
  if (typeof data === "object" && data !== null && "errors" in data && Array.isArray(data.errors)) {
    return data.errors.some((error) => error?.extensions?.code === "UNAUTHORIZED");
  }

  return false;
}
