import { describe, beforeEach, expect, test, it } from "vitest";
import { open, getSelectedText, getPreferenceValues, showToast } from "./raycast_api_mock";
import { IssueIdStyle } from "../preferences";
import Command from "../open_selected_issues";

// prettier-ignore
describe("Open Selected Issues", () => {
  beforeEach(() => {
    open.mockClear();
  });

  test.each([
    ["GITHUB_STYLE",  "no issue ids",        []],
    ["GITHUB_STYLE",  "issue #1234 test",    ["https://example.com/1234"]],
    ["GITHUB_STYLE",  "#5678",               ["https://example.com/5678"]],
    ["GITHUB_STYLE",  "#1234, #5678",        ["https://example.com/1234", "https://example.com/5678"]],
    ["JIRA_STYLE",    "no issue ids",        []],
    ["JIRA_STYLE",    "issue RAY-123 test",  ["https://example.com/RAY-123"]],
    ["JIRA_STYLE",    "RAY-123",             ["https://example.com/RAY-123"]],
    ["JIRA_STYLE",    "RAY-123, RAY-456",    ["https://example.com/RAY-123", "https://example.com/RAY-456"]],
  ])("Opens selected issue IDs in %s when selected text is '%s'", async (style: string, input: string, expected: string[]) => {
    getPreferenceValues.mockReturnValue({ url: "https://example.com/$1", format: style as IssueIdStyle });
    getSelectedText.mockResolvedValue(input);

    await Command();

    expect(open).toHaveBeenCalledTimes(expected.length);
    expected.forEach((url, index) => {
      expect(open).toHaveBeenNthCalledWith(index + 1, url);
    });
  });

  it("Shows an error toast when there are no issue IDs in the selected text", async () => {
    getSelectedText.mockResolvedValue("something something");
    await Command();
    expect(showToast).toHaveBeenCalledWith({ title: "No issue IDs selected", style: "FAILURE" });
    expect(open).not.toHaveBeenCalled();
  });

  it("Shows an error toast when there is no selected text", async () => {
    getSelectedText.mockRejectedValue(new Error());
    await Command();
    expect(showToast).toHaveBeenCalledWith({ title: "No text selected", style: "FAILURE" });
    expect(open).not.toHaveBeenCalled();
  });
});
