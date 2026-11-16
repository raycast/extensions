import { afterEach, describe, expect, it, vi } from "vitest";
import { callAregTool } from "../src/lib/mcp";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(body: unknown) {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => body });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("callAregTool", () => {
  it("sends a tools/call request with normalized org number and no empty arguments", async () => {
    const fetch = stubFetch({ result: { content: [{ type: "text", text: "# Roller" }] } });
    await expect(callAregTool("roles", { orgnr: "NO 923 609 016 MVA", year: undefined })).resolves.toBe("# Roller");
    const request = JSON.parse(fetch.mock.calls[0][1].body);
    expect(fetch.mock.calls[0][0]).toBe("https://areg.no/mcp");
    expect(request.method).toBe("tools/call");
    expect(request.params).toEqual({ name: "roles", arguments: { orgnr: "923609016" } });
  });

  it("throws the tool's error text", async () => {
    stubFetch({
      result: { content: [{ type: "text", text: "organization number must be nine digits" }], isError: true },
    });
    await expect(callAregTool("roles", { orgnr: "1" })).rejects.toThrow("nine digits");
  });
});
