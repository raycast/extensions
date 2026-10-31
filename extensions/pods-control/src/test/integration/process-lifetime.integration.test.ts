import { expect, test } from "vitest";
import { runProcessWithLifetime } from "../../homebrew/process-lifetime";

test("captures output from an ordinary detached supervisor completion", async () => {
  // Given
  const args = ["-c", "printf ready; printf warning >&2"];
  const options = {
    timeout: 1000,
  };
  // When
  const result = await runProcessWithLifetime("/bin/bash", args, options);
  // Then
  expect(result).toMatchObject({
    stdout: "ready",
    stderr: "warning",
    exitCode: 0,
    signal: null,
    timedOut: false,
    outputLimitExceeded: false,
  });
});

test("closes the lifeline on timeout and reports it after the supervisor exits", async () => {
  // Given
  const args = ["-c", "while IFS= read -r line; do :; done; printf closed"];
  const options = { timeout: 50 };
  // When
  const result = await runProcessWithLifetime("/bin/bash", args, options);
  // Then
  expect(result).toMatchObject({ stdout: "closed", timedOut: true, outputLimitExceeded: false });
});

test("closes the lifeline when output exceeds the bounded capture size", async () => {
  // Given
  const args = ["-c", "for i in 1 2 3 4; do printf 1234567890; done; IFS= read -r line || exit 0"];
  const options = { timeout: 1000, maxBuffer: 32 };
  // When
  const result = await runProcessWithLifetime("/bin/bash", args, options);
  // Then
  expect(result.outputLimitExceeded).toBe(true);
  expect(result.timedOut).toBe(false);
});
