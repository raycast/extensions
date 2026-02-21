import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function loadPackageJson() {
  const packageJsonPath = resolve(__dirname, "..", "package.json");
  const raw = readFileSync(packageJsonPath, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

test("registers read and write AI tools explicitly", () => {
  const packageJson = loadPackageJson();
  const tools = packageJson.tools as Array<{ name: string }>;
  const toolNames = tools.map((tool) => tool.name);

  assert(toolNames.includes("list-velja-rules"));
  assert(toolNames.includes("find-velja-rules-by-domain"));
  assert(toolNames.includes("create-velja-rule"));
});

test("instructions prevent write tool use for read-only queries", () => {
  const packageJson = loadPackageJson();
  const instructions = (packageJson.ai as { instructions: string }).instructions;

  assert.match(instructions, /Never call create-velja-rule unless the user explicitly asks/i);
  assert.match(instructions, /questions about existing Velja rules/i);
});

test("eval enforces medium.com query to call read tool and avoid write tool", () => {
  const packageJson = loadPackageJson();
  const ai = packageJson.ai as { evals: Array<Record<string, unknown>> };
  const evals = ai.evals ?? [];
  const mediumEval = evals.find((entry) =>
    String(entry.input ?? "").toLowerCase().includes("what rules do i have for medium.com"),
  );

  assert(mediumEval, "Expected medium.com eval to exist");

  const expected = (mediumEval as { expected: Array<Record<string, unknown>> }).expected ?? [];
  const callsDomainTool = expected.some((expectation) => {
    const callsTool = expectation.callsTool;
    if (!callsTool) {
      return false;
    }
    if (typeof callsTool === "string") {
      return callsTool === "find-velja-rules-by-domain";
    }
    return (callsTool as { name?: string }).name === "find-velja-rules-by-domain";
  });

  const forbidsCreateTool = expected.some((expectation) => {
    const notRule = expectation.not;
    if (!notRule || typeof notRule !== "object") {
      return false;
    }
    return (notRule as { callsTool?: string }).callsTool === "create-velja-rule";
  });

  assert(callsDomainTool, "Expected eval to call find-velja-rules-by-domain");
  assert(forbidsCreateTool, "Expected eval to prohibit create-velja-rule");
});
