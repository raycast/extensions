// =============================================================================
// UNIT TEST - MESSAGES (pure, no hardware)
// Proves the HUD text matches what actually happened, per mode and outcome.
// -----------------------------------------------------------------------------
// Context: Every HUD string is built here, so this locks the scheme:
//   "<subject> - <state>", a leading emoji cue, the real device name, and — the
//   key invariant — a safe skip or unsettled attempt never reads as success.
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  alreadyConnectedMessage,
  autoReconnectLabel,
  autoReconnectMessage,
  connectedMessage,
  describeModeSwitch,
  describeOutcome,
  disconnectedMessage,
  gaveUpMessage,
  mirroringFixedMessage,
  nearbyMessage,
  presenceTooltip,
  reconnectedMessage,
} from "../src/lib/messages";

import type { ModeOutcome, SidecarConfig } from "../src/lib/sidecar";

const cfg = (mode: "extend" | "mirror"): SidecarConfig => ({
  ipadName: "Cip’s iPad",
  mode,
  settleTimeoutMs: 3_000,
});

// An arbitrary reason (not the real one) proves the payload is surfaced, not a
// hardcoded phrase — a builder that ignored skippedReason would fail these.
const SKIP = "display is asleep";

describe("describeOutcome", () => {
  it("reports the settled mode with the device name and mode emoji", () => {
    assert.equal(describeOutcome(cfg("extend"), { changed: true, settled: true }), "🖥️ Cip’s iPad - Extended");
    assert.equal(describeOutcome(cfg("mirror"), { changed: true, settled: true }), "🪞 Cip’s iPad - Mirrored");
  });

  it("warns on a safe skip instead of claiming the mode changed", () => {
    const out: ModeOutcome = { changed: false, settled: false, skippedReason: SKIP };
    const line = describeOutcome(cfg("extend"), out);
    assert.equal(line, "⚠️ Cip’s iPad - Connected (display is asleep)");
    assert.notEqual(line, "🖥️ Cip’s iPad - Extended");
  });

  it("admits an unsettled attempt rather than reporting success", () => {
    assert.equal(
      describeOutcome(cfg("mirror"), { changed: true, settled: false }),
      "⚠️ Cip’s iPad - Connected, but could not mirror",
    );
  });
});

describe("describeModeSwitch", () => {
  it("reports the settled mode for a menu switch", () => {
    assert.equal(describeModeSwitch(cfg("extend"), { changed: true, settled: true }), "🖥️ Cip’s iPad - Extended");
    assert.equal(describeModeSwitch(cfg("mirror"), { changed: false, settled: true }), "🪞 Cip’s iPad - Mirrored");
  });

  it("warns on a safe skip, never a false success", () => {
    const out: ModeOutcome = { changed: false, settled: false, skippedReason: SKIP };
    const line = describeModeSwitch(cfg("extend"), out);
    assert.equal(line, "⚠️ Cip’s iPad - Display is asleep");
    assert.notEqual(line, "🖥️ Cip’s iPad - Extended");
  });

  it("reports an unsettled switch as a failure, not a success", () => {
    assert.equal(
      describeModeSwitch(cfg("extend"), { changed: true, settled: false }),
      "⚠️ Cip’s iPad - Could not extend",
    );
    assert.equal(
      describeModeSwitch(cfg("mirror"), { changed: true, settled: false }),
      "⚠️ Cip’s iPad - Could not mirror",
    );
  });
});

describe("link and toggle messages", () => {
  it("names the device in connect/disconnect/reconnect lines", () => {
    assert.equal(connectedMessage("Cip’s iPad"), "🟢 Cip’s iPad - Connected");
    assert.equal(disconnectedMessage("Cip’s iPad"), "⚪ Cip’s iPad - Disconnected");
    assert.equal(reconnectedMessage("Cip’s iPad"), "🟢 Cip’s iPad - Reconnected");
    assert.equal(alreadyConnectedMessage("Cip’s iPad"), "🟢 Cip’s iPad - Already connected");
  });

  it("phrases the mirroring fix without a device", () => {
    assert.equal(mirroringFixedMessage(), "🔧 Mirroring - Fixed");
  });

  it("uses ON/OFF caps for the auto-reconnect toggle, HUD with emoji and label without", () => {
    assert.equal(autoReconnectMessage(true), "🟢 Auto-Reconnect - ON");
    assert.equal(autoReconnectMessage(false), "⚪ Auto-Reconnect - OFF");
    assert.equal(autoReconnectLabel(true), "Auto-Reconnect - ON");
    assert.equal(autoReconnectLabel(false), "Auto-Reconnect - OFF");
  });
});

describe("presence messages", () => {
  it("names the device in the nearby and gave-up lines", () => {
    assert.equal(nearbyMessage("Cip’s iPad"), "⚪ Cip’s iPad - Nearby");
    assert.equal(gaveUpMessage("Cip’s iPad"), "⚠️ Cip’s iPad - Gave up reconnecting");
  });

  it("names the transport, so 'nearby' is not ambiguous", () => {
    const wifi = { wireless: true, wired: false };
    const cable = { wireless: false, wired: true };
    assert.equal(presenceTooltip("iPad", false, wifi, "any"), "iPad - Nearby over Wi-Fi, not connected");
    assert.equal(presenceTooltip("iPad", false, cable, "any"), "iPad - Nearby over cable, not connected");
    assert.equal(
      presenceTooltip("iPad", false, { wireless: true, wired: true }, "any"),
      "iPad - Nearby over cable and Wi-Fi, not connected",
    );
  });

  it("explains why nothing is happening when the policy excludes the transport", () => {
    // Without this the icon shows the iPad present, auto-reconnect stays
    // deliberately silent, and nothing anywhere says why — which reads as broken.
    assert.equal(
      presenceTooltip("iPad", false, { wireless: true, wired: false }, "cable"),
      "iPad - Nearby over Wi-Fi; auto-reconnect is set to cable only",
    );
    assert.equal(
      presenceTooltip("iPad", false, { wireless: false, wired: true }, "wireless"),
      "iPad - Nearby over cable; auto-reconnect is set to Wi-Fi only",
    );
  });

  it("reports away and unknown without claiming a transport", () => {
    assert.equal(presenceTooltip("iPad", false, { wireless: false, wired: false }, "any"), "iPad - Away");
    // An unavailable probe must not claim the iPad is away.
    assert.equal(presenceTooltip("iPad", false, null, "any"), "iPad - Disconnected");
  });

  it("reports connected regardless of transport or policy", () => {
    assert.equal(presenceTooltip("iPad", true, null, "cable"), "iPad - Connected");
    assert.equal(presenceTooltip("iPad", true, { wireless: true, wired: false }, "cable"), "iPad - Connected");
  });
});
