import { applyAgentOrder, boldText, moveAgent, parseBrimAgents } from "./brim-agents";

const output = JSON.stringify({
  providers: {
    "claude@1": { displayName: "Claude · a", plan: "Pro", resources: { session: { unit: "percent", used: 42 } } },
    "codex@2": { displayName: "ChatGPT · b", resources: { credits: { unit: "credits", available: 821 } } },
  },
});

describe("brim agents", () => {
  it("reads every account with its own limits", () => {
    const [claude, codex] = parseBrimAgents(output);
    expect(claude.limits[0]).toMatchObject({ label: "Session", utilization: 42, value: null });
    expect(codex.limits[0]).toMatchObject({ label: "Credits", utilization: null, value: "821 credits" });
  });

  it("applies the saved order and leaves new agents at the end", () => {
    const agents = parseBrimAgents(output);
    expect(applyAgentOrder(agents, ["codex@2"]).map((a) => a.id)).toEqual(["codex@2", "claude@1"]);
  });

  it("bolds letters and digits only", () => {
    expect(boldText("Az9 · a@b")).toBe("𝗔𝘇𝟵 · 𝗮@𝗯");
  });

  it("moves an agent and stops at the ends", () => {
    expect(moveAgent(["a", "b"], "b", -1)).toEqual(["b", "a"]);
    expect(moveAgent(["a", "b"], "a", -1)).toEqual(["a", "b"]);
  });
});
