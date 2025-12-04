import { Keyboard } from "@raycast/api";

export default {
  RESOLVE_INCIDENT: { modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[], key: "r" as Keyboard.KeyEquivalent },
  ACKNOWLEDGE_INCIDENT: { modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[], key: "a" as Keyboard.KeyEquivalent },
  ACTIVITY_LOG: { modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[], key: "l" as Keyboard.KeyEquivalent },
  OPEN_IN_SPIKE: { modifiers: ["cmd"] as Keyboard.KeyModifier[], key: "enter" as Keyboard.KeyEquivalent },
  ADD_OVERRIDE: { modifiers: ["cmd", "shift"] as Keyboard.KeyModifier[], key: "o" as Keyboard.KeyEquivalent },
};
