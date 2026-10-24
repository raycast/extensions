import { beforeEach, describe, expect, it, vi } from "vitest";
import spawnSubAgent, {
  buildEnvelope,
  confirmation,
  invokeGovernanceHook,
  parseAcknowledgement,
  parseInputContracts,
  type Input,
} from "./spawn_sub_agent";
import { LocalStorage, getPreferenceValues } from "@raycast/api";

vi.mock("@raycast/api", () => ({
  LocalStorage: { getItem: vi.fn(), setItem: vi.fn() },
  getPreferenceValues: vi.fn(),
  Tool: {},
}));
const input: Input = {
  prompt: "Return evidence",
  delegationReason: "analysis",
  originatingIntentId: "intent",
  rootExecutionId: "root",
  parentExecutionId: "parent",
  model: "model-a",
};
const res = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)),
  }) as unknown as Response;

describe("Agent Fork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.mocked(getPreferenceValues).mockReturnValue({
      ollama_endpoint: "http://ollama.test",
      default_model: "default",
      request_timeout_seconds: "10",
      log_delegations: true,
    });
    vi.mocked(LocalStorage.getItem).mockResolvedValue(undefined);
    vi.mocked(LocalStorage.setItem).mockResolvedValue();
  });
  it("presents neutral confirmation", async () => {
    const value = await confirmation(input);
    expect(value?.message).toBe("Agent Fork — delegate sub-agent execution");
    expect(value?.info?.find((x) => x.name === "Parent execution")?.value).toBe("parent");
  });
  it("parses generic metadata and preserves lineage", () => {
    const p = parseInputContracts({
      ...input,
      capabilityDescriptorJson: '{"tools":["read","write"]}',
      relationshipMetadataJson: '{"role":"reviewer"}',
    });
    expect(p.ok).toBe(true);
    if (p.ok) {
      const e = buildEnvelope(input, p.contracts);
      expect(e.parentExecutionId).toBe("parent");
      expect(e.capabilityDescriptor).toEqual({ tools: ["read", "write"] });
      expect(e.integrityHash).toMatch(/^[a-f0-9]{64}$/);
    }
  });
  it("blocks malformed contracts before dispatch", async () => {
    const value = await spawnSubAgent({ ...input, capabilityDescriptorJson: "[]" });
    expect(value.executionStatus).toBe("blocked");
    expect(value.attempts).toBe(0);
    expect(value.error).toContain("JSON object");
  });
  it("does not prescribe capability narrowing", () => {
    expect(
      parseInputContracts({ ...input, capabilityDescriptorJson: '{"callerDefined":"any-value"}' })
        .ok
    ).toBe(true);
  });
  it("returns observed evidence without certifying Done", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        res(200, {
          choices: [{ message: { content: "evidence" } }],
          usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
        })
      )
    );
    const value = await spawnSubAgent(input);
    expect(value.executionStatus).toBe("completed");
    expect(value.executionPhase).toBe("observed");
    expect(value.childOutput).toBe("evidence");
    expect(value.doneVerified).toBe(false);
    expect(value.evidence.outputObserved).toBe(true);
    expect(value.evidence.outputSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(LocalStorage.setItem).toHaveBeenCalledOnce();
  });
  it("blocks on pre-dispatch denial", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          res(200, { decision: "deny", reason: "caller policy denied", receipt: { id: "r1" } })
        )
    );
    const value = await spawnSubAgent({
      ...input,
      preDispatchHookUrl: "https://policy.test/admit",
    });
    expect(value.executionStatus).toBe("blocked");
    expect(value.attempts).toBe(0);
    expect(value.blockedReason).toBe("caller policy denied");
    expect(value.evidence.governanceReceipts[0].receipt).toEqual({ id: "r1" });
  });
  it("fails closed on malformed hook response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res(200, { status: "ok" })));
    const value = await spawnSubAgent({ ...input, preDispatchHookUrl: "https://policy.test" });
    expect(value.executionStatus).toBe("blocked");
    expect(value.error).toContain("malformed");
  });
  it("fails explicitly when configured hook is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    const value = await spawnSubAgent({ ...input, preDispatchHookUrl: "https://policy.test" });
    expect(value.executionStatus).toBe("blocked");
    expect(value.error).toContain("network unavailable");
  });
  it("post-result rejection preserves returned evidence", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(res(200, { choices: [{ message: { content: "child evidence" } }] }))
        .mockResolvedValueOnce(res(200, { decision: "reject", reason: "insufficient evidence" }))
    );
    const value = await spawnSubAgent({
      ...input,
      postResultHookUrl: "https://policy.test/validate",
    });
    expect(value.executionStatus).toBe("blocked");
    expect(value.childOutput).toBe("child evidence");
    expect(value.evidence.outputObserved).toBe(true);
  });
  it("falls back and records attempts", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(res(500, "primary"))
        .mockResolvedValueOnce(res(500, "primary fallback"))
        .mockResolvedValueOnce(res(200, { choices: [{ message: { content: "fallback" } }] }))
    );
    const value = await spawnSubAgent({ ...input, fallbackModelsCsv: "model-b" });
    expect(value.executionStatus).toBe("completed");
    expect(value.model).toBe("model-b");
    expect(value.attempts).toBe(2);
    expect(value.attemptedModels).toEqual(["model-a", "model-b"]);
  });
  it("reports timeout distinctly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }))
    );
    const value = await spawnSubAgent(input);
    expect(value.executionStatus).toBe("timeout");
    expect(value.error).toContain("Request timeout");
  });
  it("enforces acknowledgement only when requested", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          res(200, { choices: [{ message: { content: "DELEGATION_ACK: accepted\nverified" } }] })
        )
    );
    const good = await spawnSubAgent({ ...input, requireAcknowledgement: true });
    expect(good.acknowledgementVerified).toBe(true);
    expect(good.childOutput).toBe("verified");
    vi.mocked(fetch).mockResolvedValueOnce(
      res(200, { choices: [{ message: { content: "missing" } }] })
    );
    const bad = await spawnSubAgent({ ...input, requireAcknowledgement: true });
    expect(bad.executionStatus).toBe("error");
  });
  it("recovers from malformed audit storage", async () => {
    vi.mocked(LocalStorage.getItem).mockResolvedValue("bad-json");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(res(200, { choices: [{ message: { content: "output" } }] }))
    );
    expect((await spawnSubAgent(input)).executionStatus).toBe("completed");
    expect(LocalStorage.setItem).toHaveBeenCalledOnce();
  });
});
describe("hook contract", () => {
  it("accepts a generic receipt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(res(200, { decision: "allow", receipt: { policy: "caller" } }))
    );
    expect((await invokeGovernanceHook("https://policy.test", {}, {})).ok).toBe(true);
  });
  it("parses acknowledgement deterministically", () => {
    expect(parseAcknowledgement("ACK\nbody", "ACK")).toEqual({ verified: true, output: "body" });
    expect(parseAcknowledgement("body", "ACK")).toEqual({ verified: false, output: "body" });
  });
});
