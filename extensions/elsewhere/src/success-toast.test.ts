import assert from "node:assert/strict";
import test from "node:test";

import { successToastTitle } from "./success-toast";

const volumes = {
  ambienceVolume: 30,
  musicVolume: 85,
};

test("reports the applied ambience volume", () => {
  assert.equal(
    successToastTitle({ kind: "volume", target: "ambience", delta: -10 }, volumes, "Volume Decreased"),
    "Ambience Volume: 30%",
  );
});

test("reports the applied background music volume", () => {
  assert.equal(
    successToastTitle({ kind: "volume", target: "music", value: 85 }, volumes, "Volume Changed"),
    "Background Music Volume: 85%",
  );
});

test("keeps the contextual title for non-volume commands", () => {
  assert.equal(
    successToastTitle({ kind: "experience", action: "play" }, volumes, "Elsewhere Is Playing"),
    "Elsewhere Is Playing",
  );
});
