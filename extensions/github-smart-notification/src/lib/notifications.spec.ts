import { Configuration } from "./configurations";
import { Notification, isRuleMatched } from "./notifications";

const c: Configuration = {
  title: "*",
  repository: "shoppingjaws/*",
  reason: ["ci_activity"],
  description: "test",
};

const n: Notification = {
  id: "12345",
  reason: "ci_activity",
  repository: { full_name: "shoppingjaws/shoppingjaws" },
  subject: {
    latest_comment_url: "https://example.com",
    title: "Bump raycast",
    type: "PullRequest",
    url: "https://example.com",
  },
  url: "https://example.com",
  updated_at: new Date(0),
  unread: false,
};

describe("isRuleMatched", () => {
  it("Success", () => {
    expect(isRuleMatched(c, n)).toBeTruthy();
  });
});
