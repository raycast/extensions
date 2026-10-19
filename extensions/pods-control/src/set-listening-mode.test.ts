import { expect, vi, test } from "vitest";
import { setListeningMode } from "./controls/delegate-listening-mode";
import setAdaptive from "./set-adaptive";
import setNoiseCancellation from "./set-noise-cancellation";
import setOff from "./set-off";
import setTransparency from "./set-transparency";

vi.mock("./controls/delegate-listening-mode", () => ({ setListeningMode: vi.fn() }));

const mockSetListeningMode = vi.mocked(setListeningMode);

test.each([
  ["noise cancellation", setNoiseCancellation, "noise-cancellation"],
  ["transparency", setTransparency, "transparency"],
  ["adaptive", setAdaptive, "adaptive"],
  ["off", setOff, "off"],
] as const)("dispatches the %s mode through the shared gateway", async (_label, entrypoint, mode) => {
  // Given
  mockSetListeningMode.mockResolvedValue(undefined);
  // When
  await entrypoint();
  // Then
  expect(mockSetListeningMode).toHaveBeenCalledExactlyOnceWith(mode);
});
