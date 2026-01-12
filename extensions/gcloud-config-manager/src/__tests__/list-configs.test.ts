import { runGCloudCommand } from "../utils";
import { showToast, Toast } from "@raycast/api";

// Mock dependencies
jest.mock("../utils");

const mockRunGCloudCommand = runGCloudCommand as jest.MockedFunction<typeof runGCloudCommand>;

// Helper function to parse gcloud configs (from list-configs.tsx)
interface GCloudConfig {
  name: string;
  isActive: boolean;
  account?: string;
  project?: string;
  region?: string;
}

function parseGCloudConfigs(output: string): GCloudConfig[] {
  const lines = output.trim().split("\n");
  const configs: GCloudConfig[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      configs.push({
        name: parts[0],
        isActive: parts[1] === "True",
        account: parts[2] || undefined,
        project: parts[3] || undefined,
        region: parts[4] || undefined,
      });
    }
  }

  return configs;
}

// Function to test activateConfig logic from list-configs.tsx
async function activateConfig(configName: string, loadConfigs: () => void) {
  try {
    runGCloudCommand(`gcloud config configurations activate ${configName}`);
    await showToast({
      style: Toast.Style.Success,
      title: "Configuration activated",
      message: `Switched to ${configName}`,
    });
    loadConfigs();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to activate configuration",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

describe("parseGCloudConfigs for list-configs", () => {
  it("correctly parses gcloud configurations list output with isActive flag", () => {
    const mockOutput = `NAME             IS_ACTIVE  ACCOUNT                    PROJECT           COMPUTE_DEFAULT_REGION
default          False      user@example.com           my-project        us-central1
dev-config       True       dev@example.com            dev-project       us-east1
prod-config      False      prod@example.com           prod-project      europe-west1`;

    const result = parseGCloudConfigs(mockOutput);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: "default",
      isActive: false,
      account: "user@example.com",
      project: "my-project",
      region: "us-central1",
    });
    expect(result[1]).toEqual({
      name: "dev-config",
      isActive: true,
      account: "dev@example.com",
      project: "dev-project",
      region: "us-east1",
    });
    expect(result[2]).toEqual({
      name: "prod-config",
      isActive: false,
      account: "prod@example.com",
      project: "prod-project",
      region: "europe-west1",
    });
  });

  it("correctly identifies active configuration", () => {
    const mockOutput = `NAME        IS_ACTIVE  ACCOUNT              PROJECT
default     True       user@example.com     my-project
test        False      test@example.com     test-project`;

    const result = parseGCloudConfigs(mockOutput);

    expect(result[0].isActive).toBe(true);
    expect(result[1].isActive).toBe(false);
  });
});

describe("activateConfig", () => {
  let mockLoadConfigs: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadConfigs = jest.fn();
  });

  it("activates a configuration and updates the list", async () => {
    const configName = "test-config";

    await activateConfig(configName, mockLoadConfigs);

    expect(mockRunGCloudCommand).toHaveBeenCalledWith("gcloud config configurations activate test-config");
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Configuration activated",
      message: "Switched to test-config",
    });
    expect(mockLoadConfigs).toHaveBeenCalled();
  });

  it("updates list after successful activation", async () => {
    const configName = "prod-config";

    await activateConfig(configName, mockLoadConfigs);

    expect(mockLoadConfigs).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Success,
      })
    );
  });

  it("handles activation errors gracefully", async () => {
    const configName = "invalid-config";
    const error = new Error("Configuration does not exist");

    mockRunGCloudCommand.mockImplementation(() => {
      throw error;
    });

    await activateConfig(configName, mockLoadConfigs);

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Failed to activate configuration",
      message: "Configuration does not exist",
    });
    expect(mockLoadConfigs).not.toHaveBeenCalled();
  });

  it("handles non-Error exceptions", async () => {
    const configName = "error-config";

    mockRunGCloudCommand.mockImplementation(() => {
      throw "Unknown error";
    });

    await activateConfig(configName, mockLoadConfigs);

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Failed to activate configuration",
      message: "Unknown error",
    });
    expect(mockLoadConfigs).not.toHaveBeenCalled();
  });

  it("activates different configurations correctly", async () => {
    const configs = ["dev", "staging", "prod"];

    for (const config of configs) {
      jest.clearAllMocks();
      await activateConfig(config, mockLoadConfigs);

      expect(mockRunGCloudCommand).toHaveBeenCalledWith(`gcloud config configurations activate ${config}`);
      expect(showToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Configuration activated",
        message: `Switched to ${config}`,
      });
    }
  });
});
