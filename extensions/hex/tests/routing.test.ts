import { describe, expect, it } from "vitest";
import { flipSending } from "../src/lib/routing";

describe("flipSending", () => {
  it("turns sending off and keeps every other field", () => {
    const routing = {
      autoSend: "never",
      sendCaptures: true,
      servers: { local: { port: 4096 } },
      jevApiKey: "secret",
    };
    expect(flipSending(routing)).toEqual({ ...routing, sendCaptures: false });
  });

  it("turns sending back on", () => {
    expect(flipSending({ sendCaptures: false })?.sendCaptures).toBe(true);
  });

  it("doesn't change the object it was given", () => {
    const routing = { sendCaptures: true };
    flipSending(routing);
    expect(routing.sendCaptures).toBe(true);
  });

  it("refuses a router without a sendCaptures switch", () => {
    expect(flipSending({ autoSend: "never" })).toBeUndefined();
    expect(flipSending({ sendCaptures: "yes" })).toBeUndefined();
  });

  it("refuses values that aren't an object", () => {
    expect(flipSending(undefined)).toBeUndefined();
    expect(flipSending(null)).toBeUndefined();
    expect(flipSending([])).toBeUndefined();
    expect(flipSending("{}")).toBeUndefined();
  });
});
