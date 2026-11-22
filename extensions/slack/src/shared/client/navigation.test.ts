import assert from "node:assert/strict";
import test from "node:test";
import { isSlackApplication, shouldOpenInSlack } from "./navigation";
import { getConversationTeamId } from "./conversation";

test("recognizes Slack by bundle ID, Windows executable, and renamed macOS app", () => {
  assert.ok(
    isSlackApplication({ name: "Work Chat", bundleId: "com.tinyspeck.slackmacgap", path: "/Apps/Work Chat.app" }),
  );
  assert.ok(isSlackApplication({ name: "Slack.exe", path: "C:\\Users\\me\\Slack.exe" }));
  assert.ok(isSlackApplication({ name: "Slack Beta", path: "/Applications/Slack Beta.app" }));
  assert.ok(isSlackApplication({ name: "Work Chat", path: "/Users/me/Applications/Slack.app" }));
  assert.equal(isSlackApplication({ name: "Slack Helper", path: "/Apps/Slack Helper.app" }), false);
});

test("explicit link preference works without application enumeration", async () => {
  const unavailable = async () => {
    throw new Error("App enumeration unavailable");
  };
  assert.equal(await shouldOpenInSlack("slack", unavailable), true);
  assert.equal(await shouldOpenInSlack("browser", unavailable), false);
  assert.equal(await shouldOpenInSlack("auto", unavailable), true);
  assert.equal(await shouldOpenInSlack("auto", async () => []), false);
});

test("Slack Connect links use the context workspace ahead of the shared channel owner", () => {
  assert.equal(
    getConversationTeamId({
      context_team_id: "TLOCAL",
      internal_team_ids: ["TREMOTE"],
      shared_team_ids: ["TREMOTE", "TLOCAL"],
    }),
    "TLOCAL",
  );
  assert.equal(getConversationTeamId({ internal_team_ids: ["TLOCAL"] }), "TLOCAL");
});
