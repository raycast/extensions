import assert from "node:assert/strict";
import test from "node:test";

import { getLabelOpenProps } from "../src/helpers/favorites.ts";

test("workspace-level labels open the URL provided by the favorite", () => {
  const result = getLabelOpenProps("https://linear.app/acme/label/company-wide");

  assert.deepEqual(result, {
    title: "Open Label",
    url: "https://linear.app/acme/label/company-wide",
  });
});

test("team labels keep their team-scoped URL provided by the favorite", () => {
  const result = getLabelOpenProps("https://linear.app/acme/team/ENG/label/infra");

  assert.deepEqual(result, {
    title: "Open Label",
    url: "https://linear.app/acme/team/ENG/label/infra",
  });
});

test("labels without a favorite URL render without an open action", () => {
  assert.equal(getLabelOpenProps(undefined), null);
  assert.equal(getLabelOpenProps(""), null);
});
