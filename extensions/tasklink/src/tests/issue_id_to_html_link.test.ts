import { describe, beforeEach, expect, test, it } from "vitest";
import { Clipboard, getSelectedText, getPreferenceValues, showToast } from "./raycast_api_mock";
import Command from "../issue_id_to_html_link";
import { IssueIdStyle } from "../preferences";

// prettier-ignore
describe("Issue ID to HTML Links", () => {
  beforeEach(() => {
    Clipboard.paste.mockClear();
  });

  test.each([
    ["GITHUB_STYLE",  "no issue ids",        `no issue ids`],
    ["GITHUB_STYLE",  "issue #1234 test",    `issue <a href="https://example.com/1234">#1234</a> test`],
    ["GITHUB_STYLE",  "#5678",               `<a href="https://example.com/5678">#5678</a>`],
    ["GITHUB_STYLE",  "#1234, #5678",        `<a href="https://example.com/1234">#1234</a>, <a href="https://example.com/5678">#5678</a>`],
    ["JIRA_STYLE",    "no issue ids",        `no issue ids`],
    ["JIRA_STYLE",    "issue RAY-123 test",  `issue <a href="https://example.com/RAY-123">RAY-123</a> test`],
    ["JIRA_STYLE",    "RAY-123",             `<a href="https://example.com/RAY-123">RAY-123</a>`],
    ["JIRA_STYLE",    "RAY-123, RAY-456",    `<a href="https://example.com/RAY-123">RAY-123</a>, <a href="https://example.com/RAY-456">RAY-456</a>`],
  ])("Converts issue IDs in %s when selected text is '%s'", async (style: string, input: string, expected: string) => {
    getPreferenceValues.mockReturnValue({ url: "https://example.com/$1", format: style as IssueIdStyle });
    getSelectedText.mockResolvedValue(input);
    await Command();
    expect(Clipboard.paste).toHaveBeenCalledWith({ html: expected });
  });

  it("Keeps line breaks when the selected text has multiple lines", async () => {
    getPreferenceValues.mockReturnValue({ url: "https://example.com/$1", format: "JIRA_STYLE" });
    getSelectedText.mockResolvedValue(
      "- RAY-123: First\n" +
      "- RAY-456: Second\n" +
      "- RAY-789: Third");
    await Command();
    expect(Clipboard.paste).toHaveBeenCalledWith({
      html:
        `- <a href="https://example.com/RAY-123">RAY-123</a>: First<br />` +
        `- <a href="https://example.com/RAY-456">RAY-456</a>: Second<br />` +
        `- <a href="https://example.com/RAY-789">RAY-789</a>: Third`,
    });
  });

  it("Shows an error toast when there is no selected text", async () => {
    getSelectedText.mockRejectedValue(new Error());
    await Command();
    expect(showToast).toHaveBeenCalledWith({ title: "No text selected", style: "FAILURE" });
    expect(Clipboard.paste).not.toHaveBeenCalled();
  });
});
