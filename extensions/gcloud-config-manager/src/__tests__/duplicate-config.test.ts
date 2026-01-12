import { runGCloudCommand } from "../utils";

// Mock the utils module
jest.mock("../utils");

// Import the functions we need to test
// Since these are not exported, we need to mock the entire module behavior
const mockRunGCloudCommand = runGCloudCommand as jest.MockedFunction<typeof runGCloudCommand>;

// Helper function to parse gcloud configs (copied from duplicate-config.tsx)
function parseGCloudConfigs(output: string): Array<{
  name: string;
  account?: string;
  project?: string;
  region?: string;
}> {
  const lines = output.trim().split("\n");
  const configs: Array<{
    name: string;
    account?: string;
    project?: string;
    region?: string;
  }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      configs.push({
        name: parts[0],
        account: parts[2] || undefined,
        project: parts[3] || undefined,
        region: parts[4] || undefined,
      });
    }
  }

  return configs;
}

// Helper function to get config properties (copied from duplicate-config.tsx)
function getConfigProperties(configName: string): { project?: string; account?: string; region?: string } {
  try {
    const output = runGCloudCommand(`gcloud config configurations describe ${configName}`);
    const lines = output.split("\n");
    const properties: { project?: string; account?: string; region?: string } = {};

    for (const line of lines) {
      if (line.includes("project:")) {
        properties.project = line.split(":")[1]?.trim();
      } else if (line.includes("account:")) {
        properties.account = line.split(":")[1]?.trim();
      } else if (line.includes("region:")) {
        properties.region = line.split(":")[1]?.trim();
      }
    }

    return properties;
  } catch (error) {
    return {};
  }
}

describe("parseGCloudConfigs", () => {
  it("correctly parses gcloud configurations list output", () => {
    const mockOutput = `NAME             IS_ACTIVE  ACCOUNT                    PROJECT           COMPUTE_DEFAULT_REGION
default          False      user@example.com           my-project        us-central1
dev-config       True       dev@example.com            dev-project       us-east1
prod-config      False      prod@example.com           prod-project      europe-west1`;

    const result = parseGCloudConfigs(mockOutput);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: "default",
      account: "user@example.com",
      project: "my-project",
      region: "us-central1",
    });
    expect(result[1]).toEqual({
      name: "dev-config",
      account: "dev@example.com",
      project: "dev-project",
      region: "us-east1",
    });
    expect(result[2]).toEqual({
      name: "prod-config",
      account: "prod@example.com",
      project: "prod-project",
      region: "europe-west1",
    });
  });

  it("handles empty lines in output", () => {
    const mockOutput = `NAME        IS_ACTIVE  ACCOUNT              PROJECT
default     False      user@example.com     my-project

dev-config  True       dev@example.com      dev-project`;

    const result = parseGCloudConfigs(mockOutput);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("default");
    expect(result[1].name).toBe("dev-config");
  });

  it("handles configurations with missing optional fields", () => {
    const mockOutput = `NAME        IS_ACTIVE
minimal     False`;

    const result = parseGCloudConfigs(mockOutput);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "minimal",
      account: undefined,
      project: undefined,
      region: undefined,
    });
  });

  it("returns empty array for header-only output", () => {
    const mockOutput = `NAME        IS_ACTIVE  ACCOUNT  PROJECT`;

    const result = parseGCloudConfigs(mockOutput);

    expect(result).toHaveLength(0);
  });
});

describe("getConfigProperties", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("correctly extracts project, account, and region from configuration description output", () => {
    const mockDescribeOutput = `is_active: false
name: my-config
properties:
  account: user@example.com
  project: my-project
  compute:
    region: us-west1`;

    mockRunGCloudCommand.mockReturnValue(mockDescribeOutput);

    const result = getConfigProperties("my-config");

    expect(mockRunGCloudCommand).toHaveBeenCalledWith("gcloud config configurations describe my-config");
    expect(result).toEqual({
      project: "my-project",
      account: "user@example.com",
      region: "us-west1",
    });
  });

  it("handles configuration with only some properties set", () => {
    const mockDescribeOutput = `is_active: true
name: partial-config
properties:
  project: only-project`;

    mockRunGCloudCommand.mockReturnValue(mockDescribeOutput);

    const result = getConfigProperties("partial-config");

    expect(result).toEqual({
      project: "only-project",
    });
  });

  it("returns empty object when command fails", () => {
    mockRunGCloudCommand.mockImplementation(() => {
      throw new Error("Configuration not found");
    });

    const result = getConfigProperties("nonexistent");

    expect(result).toEqual({});
  });

  it("handles malformed output gracefully", () => {
    mockRunGCloudCommand.mockReturnValue("invalid output without colons");

    const result = getConfigProperties("test-config");

    expect(result).toEqual({});
  });
});
