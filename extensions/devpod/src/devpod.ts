export interface DevPodWorkspace {
  id: string;
  uid: string;
  provider: {
    name: string;
    options: {
      [key: string]: {
        value?: string;
        userProvided: boolean;
      };
    };
  };
  machine: Record<string, unknown>;
  ide: {
    name: string;
  };
  source: {
    gitRepository: string;
  };
  creationTimestamp: string;
  lastUsed: string;
  context: string;
}

export interface DevPodWorkspaceStatus {
  id: string;
  context: string;
  provider: string;
  state: DevPodWorkspaceState;
}

export const DEFAULT_CONTAINER_IMAGES = [
  "https://github.com/microsoft/vscode-remote-try-java",
  "https://github.com/microsoft/vscode-remote-try-python",
  "https://github.com/microsoft/vscode-remote-try-go",
  "https://github.com/microsoft/vscode-remote-try-cpp",
  "https://github.com/microsoft/vscode-remote-try-php",
  "https://github.com/microsoft/vscode-remote-try-dotnet",
  "https://github.com/microsoft/vscode-remote-try-node",
  "https://github.com/microsoft/vscode-remote-try-rust",
];

export const EXTRA_CONTAINER_IMAGES = [
  "https://github.com/devcontainers/images/tree/main/src/anaconda",
  "https://github.com/devcontainers/images/tree/main/src/base-alpine",
  "https://github.com/devcontainers/images/tree/main/src/base-debian",
  "https://github.com/devcontainers/images/tree/main/src/base-ubuntu",
  "https://github.com/devcontainers/images/tree/main/src/cpp",
  "https://github.com/devcontainers/images/tree/main/src/dotnet",
  "https://github.com/devcontainers/images/tree/main/src/go",
  "https://github.com/devcontainers/images/tree/main/src/java-8",
  "https://github.com/devcontainers/images/tree/main/src/java",
  "https://github.com/devcontainers/images/tree/main/src/javascript-node",
  "https://github.com/devcontainers/images/tree/main/src/jekyll",
  "https://github.com/devcontainers/images/tree/main/src/miniconda",
  "https://github.com/devcontainers/images/tree/main/src/php",
  "https://github.com/devcontainers/images/tree/main/src/python",
  "https://github.com/devcontainers/images/tree/main/src/ruby",
  "https://github.com/devcontainers/images/tree/main/src/rust",
  "https://github.com/devcontainers/images/tree/main/src/typescript-node",
  "https://github.com/devcontainers/images/tree/main/src/universal",
];

export const ALL_THIRD_PARTY_IMAGES = [...DEFAULT_CONTAINER_IMAGES, ...EXTRA_CONTAINER_IMAGES];

export enum DevPodWorkspaceState {
  Running = "Running",
  Stopped = "Stopped",
}

// https://devpod.sh/docs/developing-in-workspaces/create-a-workspace
export const DevPodWorkspaceCommand = {
  listAsJson: ["ls", "--output", "json"],
  up: (id: string) => ["up", id],
  stop: (id: string) => ["stop", id],
  recreate: (id: string) => ["up", id, "--recreate"], // When recreating a workspace, changes only to the project path or mounted volumes will be preserved. All other changes made in the container will be lost.
  reset: (id: string) => ["up", id, "--reset"], //  When resetting a workspace, no changes will be preserved!
  delete: (id: string) => ["delete", id],
  deleteForce: (id: string) => ["delete", id, "--force"],
  logs: (id: string) => ["logs", "--debug", id],
  statusAsJson: (id: string) => ["status", id, "--output", "json"],
};
