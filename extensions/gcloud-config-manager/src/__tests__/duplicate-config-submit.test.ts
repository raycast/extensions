import { runGCloudCommand } from "../utils";
import { showToast, popToRoot, Toast } from "@raycast/api";

// Mock dependencies
jest.mock("../utils");

const mockRunGCloudCommand = runGCloudCommand as jest.MockedFunction<
  typeof runGCloudCommand
>;

// Helper function (from duplicate-config.tsx)
function getConfigProperties(configName: string): {
  project?: string;
  account?: string;
  region?: string;
} {
  try {
    const output = runGCloudCommand(
      `gcloud config configurations describe ${configName}`,
    );
    const lines = output.split("\n");
    const properties: { project?: string; account?: string; region?: string } =
      {};

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
  } catch (_error) {
    return {};
  }
}

// Function to test handleSubmit logic from duplicate-config.tsx
async function handleSubmit(
  values: { sourceConfig: string; newName: string },
  setNameError: (error: string | undefined) => void,
) {
  if (!values.newName) {
    setNameError("New configuration name is required");
    return;
  }

  if (!values.sourceConfig) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Source configuration required",
      message: "Please select a configuration to duplicate",
    });
    return;
  }

  try {
    // Get properties from source configuration
    const properties = getConfigProperties(values.sourceConfig);

    // Create new configuration
    runGCloudCommand(`gcloud config configurations create ${values.newName}`);

    // Copy properties to new configuration
    if (properties.project) {
      runGCloudCommand(
        `gcloud config set project ${properties.project} --configuration=${values.newName}`,
      );
    }

    if (properties.account) {
      runGCloudCommand(
        `gcloud config set account ${properties.account} --configuration=${values.newName}`,
      );
    }

    if (properties.region) {
      runGCloudCommand(
        `gcloud config set compute/region ${properties.region} --configuration=${values.newName}`,
      );
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Configuration duplicated",
      message: `Created ${values.newName} from ${values.sourceConfig}`,
    });

    popToRoot();
  } catch (_error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to duplicate configuration",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

describe("duplicate-config handleSubmit", () => {
  let mockSetNameError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetNameError = jest.fn();
  });

  it("validates new configuration name is required", async () => {
    const values = {
      sourceConfig: "source-config",
      newName: "",
    };

    await handleSubmit(values, mockSetNameError);

    expect(mockSetNameError).toHaveBeenCalledWith(
      "New configuration name is required",
    );
    expect(mockRunGCloudCommand).not.toHaveBeenCalled();
    expect(popToRoot).not.toHaveBeenCalled();
  });

  it("validates source configuration is required", async () => {
    const values = {
      sourceConfig: "",
      newName: "new-config",
    };

    await handleSubmit(values, mockSetNameError);

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Source configuration required",
      message: "Please select a configuration to duplicate",
    });
    expect(mockRunGCloudCommand).not.toHaveBeenCalled();
    expect(popToRoot).not.toHaveBeenCalled();
  });

  it("duplicates configuration with all properties", async () => {
    const values = {
      sourceConfig: "source-config",
      newName: "new-config",
    };

    const mockDescribeOutput = `is_active: false
name: source-config
properties:
  account: user@example.com
  project: my-project
  compute:
    region: us-west1`;

    mockRunGCloudCommand.mockImplementation((cmd: string) => {
      if (cmd.includes("describe")) {
        return mockDescribeOutput;
      }
      return "";
    });

    await handleSubmit(values, mockSetNameError);

    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config configurations describe source-config",
    );
    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config configurations create new-config",
    );
    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config set project my-project --configuration=new-config",
    );
    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config set account user@example.com --configuration=new-config",
    );
    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config set compute/region us-west1 --configuration=new-config",
    );

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Configuration duplicated",
      message: "Created new-config from source-config",
    });
    expect(popToRoot).toHaveBeenCalled();
  });

  it("duplicates configuration with partial properties", async () => {
    const values = {
      sourceConfig: "minimal-source",
      newName: "minimal-copy",
    };

    const mockDescribeOutput = `is_active: true
name: minimal-source
properties:
  project: only-project`;

    mockRunGCloudCommand.mockImplementation((cmd: string) => {
      if (cmd.includes("describe")) {
        return mockDescribeOutput;
      }
      return "";
    });

    await handleSubmit(values, mockSetNameError);

    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config configurations describe minimal-source",
    );
    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config configurations create minimal-copy",
    );
    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config set project only-project --configuration=minimal-copy",
    );
    // Account and region should not be set
    expect(mockRunGCloudCommand).not.toHaveBeenCalledWith(
      expect.stringContaining("gcloud config set account"),
    );
    expect(mockRunGCloudCommand).not.toHaveBeenCalledWith(
      expect.stringContaining("gcloud config set compute/region"),
    );

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Configuration duplicated",
      message: "Created minimal-copy from minimal-source",
    });
  });

  it("duplicates configuration with no properties", async () => {
    const values = {
      sourceConfig: "empty-source",
      newName: "empty-copy",
    };

    mockRunGCloudCommand.mockImplementation((cmd: string) => {
      if (cmd.includes("describe")) {
        return "is_active: false\nname: empty-source";
      }
      return "";
    });

    await handleSubmit(values, mockSetNameError);

    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config configurations describe empty-source",
    );
    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config configurations create empty-copy",
    );
    // Only create command should be called, no property setting
    expect(mockRunGCloudCommand).toHaveBeenCalledTimes(2);

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Configuration duplicated",
      message: "Created empty-copy from empty-source",
    });
  });

  it("handles errors during duplication", async () => {
    const values = {
      sourceConfig: "source-config",
      newName: "new-config",
    };

    const error = new Error("Configuration already exists");
    mockRunGCloudCommand.mockImplementation(() => {
      throw error;
    });

    await handleSubmit(values, mockSetNameError);

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Failed to duplicate configuration",
      message: "Configuration already exists",
    });
    expect(popToRoot).not.toHaveBeenCalled();
  });
});
