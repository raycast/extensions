import { State } from "./types";
import { spawnSync } from "child_process";

export function doEval(state: State): State {
  // Since we're using single quotes in our interpolation, we need to ensure our
  // query only contains single quotes.
  const query = state.query.trim().replace(/'/g, '"') ?? "";
  const interpolation = `puts eval('${query}')`;
  const envVars = { LC_ALL: "en_US.UTF-8", LANG: "en_US.UTF-8" };
  const command = spawnSync("ruby", ["-e", interpolation], { encoding: "utf8", env: envVars });

  const result = command.stdout || command.stderr?.toString() || command?.error?.message || "";
  const markdownResult = result != null ? "```rb\n" + query + "\n#=> " + result + "\n```" : "";

  return { ...state, result, markdownResult };
}
