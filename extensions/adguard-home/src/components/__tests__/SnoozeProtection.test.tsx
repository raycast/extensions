import { getStatus, disableProtection } from "../../api";

// Mock the API functions only
jest.mock("../../api");

// Mock just the bare minimum from Raycast
jest.mock("@raycast/api", () => ({
  showToast: jest.fn(),
  getPreferenceValues: () => ({
    serverUrl: "http://localhost",
    username: "test",
    password: "test",
  }),
  Toast: { Style: { Success: "success", Failure: "failure" } },
}));

describe("SnoozeProtection API", () => {
  const mockStatus = {
    protection_enabled: true,
    filtering_enabled: true,
    dns_queries: 100,
    blocked_today: 10,
    protection_disabled_duration: null,
    protection_disabled_until: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getStatus as jest.Mock).mockResolvedValue(mockStatus);
  });

  it("can disable protection", async () => {
    (disableProtection as jest.Mock).mockResolvedValueOnce(undefined);
    await disableProtection(60 * 1000);
    expect(disableProtection).toHaveBeenCalledWith(60 * 1000);
  });

  it("handles API errors", async () => {
    const error = new Error("API Error");
    (disableProtection as jest.Mock).mockRejectedValueOnce(error);

    try {
      await disableProtection(60 * 1000);
    } catch (e) {
      expect(e).toBe(error);
    }
  });
});
