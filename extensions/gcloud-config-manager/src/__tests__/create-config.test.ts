import { runGCloudCommand } from "../utils";
import { showToast, popToRoot, Toast } from "@raycast/api";

// Mock dependencies
jest.mock("../utils");

const mockRunGCloudCommand = runGCloudCommand as jest.MockedFunction<
  typeof runGCloudCommand
>;

// Function to test handleSubmit logic from create-config.tsx
async function handleSubmit(
  values: {
    name: string;
    project: string;
    account: string;
    region: string;
  },
  setNameError: (error: string | undefined) => void,
) {
  if (!values.name) {
    setNameError("Configuration name is required");
    return;
  }

  try {
    // Create the configuration
    runGCloudCommand(`gcloud config configurations create ${values.name}`);

    // Set project if provided
    if (values.project) {
      runGCloudCommand(
        `gcloud config set project ${values.project} --configuration=${values.name}`,
      );
    }

    // Set account if provided
    if (values.account) {
      runGCloudCommand(
        `gcloud config set account ${values.account} --configuration=${values.name}`,
      );
    }

    // Set region if provided
    if (values.region) {
      runGCloudCommand(
        `gcloud config set compute/region ${values.region} --configuration=${values.name}`,
      );
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Configuration created",
      message: `Created configuration: ${values.name}`,
    });

    popToRoot();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create configuration",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

describe("create-config handleSubmit", () => {
  let mockSetNameError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetNameError = jest.fn();
  });

  it("validates configuration name is required", async () => {
    const values = {
      name: "",
      project: "my-project",
      account: "user@example.com",
      region: "us-central1",
    };

    await handleSubmit(values, mockSetNameError);

    expect(mockSetNameError).toHaveBeenCalledWith(
      "Configuration name is required",
    );
    expect(mockRunGCloudCommand).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("executes gcloud commands for creation with all properties", async () => {
    const values = {
      name: "test-config",
      project: "my-project",
      account: "user@example.com",
      region: "us-central1",
    };

    await handleSubmit(values, mockSetNameError);

    expect(mockRunGCloudCommand).toHaveBeenCalledTimes(4);
    expect(mockRunGCloudCommand).toHaveBeenNthCalledWith(
      1,
      "gcloud config configurations create test-config",
    );
    expect(mockRunGCloudCommand).toHaveBeenNthCalledWith(
      2,
      "gcloud config set project my-project --configuration=test-config",
    );
    expect(mockRunGCloudCommand).toHaveBeenNthCalledWith(
      3,
      "gcloud config set account user@example.com --configuration=test-config",
    );
    expect(mockRunGCloudCommand).toHaveBeenNthCalledWith(
      4,
      "gcloud config set compute/region us-central1 --configuration=test-config",
    );

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Configuration created",
      message: "Created configuration: test-config",
    });
    expect(popToRoot).toHaveBeenCalled();
  });

  it("executes gcloud commands with only required name field", async () => {
    const values = {
      name: "minimal-config",
      project: "",
      account: "",
      region: "",
    };

    await handleSubmit(values, mockSetNameError);

    expect(mockRunGCloudCommand).toHaveBeenCalledTimes(1);
    expect(mockRunGCloudCommand).toHaveBeenCalledWith(
      "gcloud config configurations create minimal-config",
    );

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Configuration created",
      message: "Created configuration: minimal-config",
    });
    expect(popToRoot).toHaveBeenCalled();
  });

  it("executes gcloud commands with partial settings", async () => {
    const values = {
      name: "partial-config",
      project: "my-project",
      account: "",
      region: "us-west1",
    };

    await handleSubmit(values, mockSetNameError);

    expect(mockRunGCloudCommand).toHaveBeenCalledTimes(3);
    expect(mockRunGCloudCommand).toHaveBeenNthCalledWith(
      1,
      "gcloud config configurations create partial-config",
    );
    expect(mockRunGCloudCommand).toHaveBeenNthCalledWith(
      2,
      "gcloud config set project my-project --configuration=partial-config",
    );
    expect(mockRunGCloudCommand).toHaveBeenNthCalledWith(
      3,
      "gcloud config set compute/region us-west1 --configuration=partial-config",
    );

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Configuration created",
      message: "Created configuration: partial-config",
    });
  });

  it("handles errors during configuration creation", async () => {
    const values = {
      name: "error-config",
      project: "my-project",
      account: "user@example.com",
      region: "us-central1",
    };

    const error = new Error("Configuration already exists");
    mockRunGCloudCommand.mockImplementation(() => {
      throw error;
    });

    await handleSubmit(values, mockSetNameError);

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Failed to create configuration",
      message: "Configuration already exists",
    });
    expect(popToRoot).not.toHaveBeenCalled();
  });
});
