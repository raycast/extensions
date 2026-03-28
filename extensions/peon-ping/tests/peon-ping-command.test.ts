import { expect, test } from "vitest";

test("Peon Ping command module loads with Raycast test doubles", async () => {
  const mod = await import("../src/peon-ping");
  expect(typeof mod.default).toBe("function");
});
