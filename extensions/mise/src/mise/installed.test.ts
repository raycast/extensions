import { describe, expect, it } from "vitest";
import { MiseOutputError } from "./exec";
import { parseInstalled } from "./installed";
import fixture from "./fixtures/ls.json";

describe("parseInstalled", () => {
  const tools = parseInstalled(fixture);

  it("keeps the tool names as mise ls keys, backend prefixes included", () => {
    expect(tools.map((t) => t.name)).toEqual(["node", "jq", "npm:wrangler", "rust"]);
  });

  it("maps versions with active marker, requested version and source", () => {
    const node = tools.find((t) => t.name === "node");
    expect(node?.versions).toHaveLength(8);
    expect(node?.versions.filter((v) => v.active)).toEqual([
      {
        version: "24.21.0",
        installPath: "/Users/lachlan/.local/share/mise/installs/node/24.21.0",
        active: true,
        requestedVersion: "lts",
        source: { type: "mise.toml", path: "/Users/lachlan/.config/mise/conf.d/tools.toml" },
      },
    ]);
    expect(node?.versions[0]).toEqual({
      version: "22.21.0",
      installPath: "/Users/lachlan/.local/share/mise/installs/node/22.21.0",
      active: false,
    });
  });

  it("drops versions that are requested but not installed, and tools left with none", () => {
    const parsed = parseInstalled({
      jq: [
        { version: "1.7.1", install_path: "/x/jq/1.7.1", installed: false, active: true },
        { version: "1.8.2", install_path: "/x/jq/1.8.2", installed: true, active: false },
      ],
      ghost: [{ version: "1.0.0", install_path: "/x/ghost/1.0.0", installed: false, active: false }],
    });
    expect(parsed).toEqual([
      { name: "jq", versions: [{ version: "1.8.2", installPath: "/x/jq/1.8.2", active: false }] },
    ]);
  });

  it("throws MiseOutputError on a shape mismatch", () => {
    expect(() => parseInstalled([])).toThrow(MiseOutputError);
    expect(() => parseInstalled({ jq: "1.8.2" })).toThrow(/jq is not an array/);
    expect(() => parseInstalled({ jq: [{ version: 1 }] })).toThrow(/malformed version/);
  });
});
