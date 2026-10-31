import { expect, vi, test } from "vitest";
import {
  confirmedConversationAwareness,
  confirmedListeningMode,
  cycleListeningMode,
  getConversationAwareness,
  getListeningMode,
  setConversationAwareness,
  setListeningMode,
} from "./client";
import { CliError } from "./errors";
import { runCli } from "./transport";
import type * as CliModule from "./transport";

vi.mock("./transport", async (importOriginal) => {
  const actual = await importOriginal<typeof CliModule>();
  return { ...actual, runCli: vi.fn() };
});

const mockRunCli = vi.mocked(runCli);

test.each([
  ["off", "off"],
  ["transparency", "transparency"],
  ["adaptive", "adaptive"],
  ["noise-cancellation", "noise-cancellation"],
] as const)("sets %s using the canonical CLI token", async (mode, token) => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods", listeningMode: token });
  // When
  const result = setListeningMode(mode);
  // Then
  await expect(result).resolves.toBe(mode);
  expect(mockRunCli).toHaveBeenCalledWith(["listening-mode", "set", token]);
});

test("treats a no-op with the requested confirmed mode as success", async () => {
  // Given
  mockRunCli.mockRejectedValue(
    new CliError("no-op", { result: "error", device: "AirPods", listeningMode: "noise-cancellation" }),
  );
  // When
  const result = setListeningMode("noise-cancellation");
  // Then
  await expect(result).resolves.toBe("noise-cancellation");
});

test("rejects a successful set response that confirms a different mode", async () => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods", listeningMode: "transparency" });
  // When
  const result = setListeningMode("noise-cancellation");
  // Then
  await expect(result).rejects.toMatchObject({
    code: "no-op",
    payload: expect.objectContaining({ listeningMode: "transparency" }),
  });
});

test("cycles a selected set in CLI order supplied by the workflow", async () => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods", listeningMode: "adaptive" });
  // When
  const result = cycleListeningMode(["off", "adaptive", "noise-cancellation"]);
  // Then
  await expect(result).resolves.toBe("adaptive");
  expect(mockRunCli).toHaveBeenCalledWith(["listening-mode", "cycle", "--modes", "off,adaptive,noise-cancellation"]);
});

test("uses a bare CLI cycle when no selected set is supplied", async () => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods", listeningMode: "off" });
  // When
  await cycleListeningMode();
  // Then
  expect(mockRunCli).toHaveBeenCalledWith(["listening-mode", "cycle"]);
});

test("gets and maps the current listening mode", async () => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods", listeningMode: "noise-cancellation" });
  // When
  const result = getListeningMode();
  // Then
  await expect(result).resolves.toBe("noise-cancellation");
});

test.each([null, "", "future-mode", "toString", "constructor", "__proto__"])(
  "rejects invalid listening mode %s",
  async (listeningMode) => {
    // Given
    mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods", listeningMode });
    // When
    const result = getListeningMode();
    // Then
    await expect(result).rejects.toMatchObject({ code: "invalid-response" });
  },
);

test("gets Conversation Awareness", async () => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods", conversationAwareness: "on" });
  // When
  const result = getConversationAwareness();
  // Then
  await expect(result).resolves.toBe("on");
  expect(mockRunCli).toHaveBeenCalledWith(["conversation-awareness", "get"]);
});

test("treats unavailable Conversation Awareness as unsupported", async () => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "Other Headphones", conversationAwareness: null });
  // When
  const result = getConversationAwareness();
  // Then
  await expect(result).rejects.toMatchObject({ code: "unsupported" });
});

test("rejects a response that omits Conversation Awareness state", async () => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods" });
  // When
  const result = getConversationAwareness();
  // Then
  await expect(result).rejects.toMatchObject({ code: "invalid-response" });
});

test("rejects an unknown Conversation Awareness state", async () => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods", conversationAwareness: "automatic" });
  // When
  const result = getConversationAwareness();
  // Then
  await expect(result).rejects.toMatchObject({ code: "invalid-response" });
});

test("sets and confirms Conversation Awareness", async () => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods", conversationAwareness: "off" });
  // When
  const result = setConversationAwareness("off");
  // Then
  await expect(result).resolves.toBe("off");
  expect(mockRunCli).toHaveBeenCalledWith(["conversation-awareness", "set", "off"]);
});

test("treats a confirmed Conversation Awareness no-op as success", async () => {
  // Given
  mockRunCli.mockRejectedValue(
    new CliError("no-op", { result: "error", device: "AirPods", conversationAwareness: "on" }),
  );
  // When
  const result = setConversationAwareness("on");
  // Then
  await expect(result).resolves.toBe("on");
});

test("rejects an unknown state returned after setting Conversation Awareness", async () => {
  // Given
  mockRunCli.mockResolvedValue({ result: "ok", device: "AirPods", conversationAwareness: "automatic" });
  // When
  const result = setConversationAwareness("on");
  // Then
  await expect(result).rejects.toMatchObject({ code: "invalid-response" });
});

test.each([
  { name: "confirmed transparency", listeningMode: "transparency", expected: "transparency" },
  { name: "unrecognized mode", listeningMode: "future-mode", expected: null },
])("extracts a listening-mode result for $name", ({ listeningMode, expected }) => {
  // Given
  const payload = { result: "error" as const, device: "AirPods", listeningMode };
  // When
  const state = confirmedListeningMode(payload);
  // Then
  expect(state).toBe(expected);
});

test.each([
  { name: "confirmed off", conversationAwareness: "off", expected: "off" },
  { name: "unrecognized state", conversationAwareness: "automatic", expected: null },
])("extracts a Conversation Awareness result for $name", ({ conversationAwareness, expected }) => {
  // Given
  const payload = { result: "error" as const, device: "AirPods", conversationAwareness };
  // When
  const state = confirmedConversationAwareness(payload);
  // Then
  expect(state).toBe(expected);
});
