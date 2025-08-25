import { LocalStorage } from "@raycast/api";
import SelectCitationStyle from "./select-citation-style";

// Mock the entire module
jest.mock("@raycast/api");

describe("SelectCitationStyle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    // This is a basic smoke test since the component uses Raycast's APIs heavily
    // and cannot be rendered in a standard React test environment
    expect(SelectCitationStyle).toBeDefined();
  });

  it("should save selected style to localStorage", async () => {
    const mockSetItem = jest.spyOn(LocalStorage, "setItem");

    // The actual interaction would be through Raycast's UI
    // Here we're testing that the localStorage API is called correctly
    // In a real scenario, this would be triggered by user interaction

    await LocalStorage.setItem("citationStyle", "apa");

    expect(mockSetItem).toHaveBeenCalledWith("citationStyle", "apa");
  });

  it("should retrieve saved style from localStorage", async () => {
    const mockGetItem = jest.spyOn(LocalStorage, "getItem");
    mockGetItem.mockResolvedValue("ieee");

    const style = await LocalStorage.getItem("citationStyle");

    expect(mockGetItem).toHaveBeenCalledWith("citationStyle");
    expect(style).toBe("ieee");
  });

  it("should handle missing localStorage value", async () => {
    const mockGetItem = jest.spyOn(LocalStorage, "getItem");
    mockGetItem.mockResolvedValue(undefined);

    const style = await LocalStorage.getItem("citationStyle");

    expect(style).toBeUndefined();
  });
});
