import assert from "node:assert/strict";
import test from "node:test";

import { getLabelOpenProps } from "../src/helpers/favorites.ts";

const baseLinearUrl = "https://linear.app/acme";

test("workspace-level labels render without an open action", () => {
  const result = getLabelOpenProps(baseLinearUrl, {
    id: "label-workspace",
    name: "company-wide",
    color: "#ff0000",
    team: null,
  });

  assert.equal(result, null);
});

test("team labels keep the team-scoped open action", () => {
  const result = getLabelOpenProps(baseLinearUrl, {
    id: "label-team",
    name: "infra",
    color: "#00ff00",
    team: { key: "ENG" },
  });

  assert.deepEqual(result, {
    title: "Open Label",
    url: "https://linear.app/acme/team/ENG/label/infra",
  });
});
