import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const executable = fileURLToPath(new URL("../assets/compiled_raycast_swift/hide-details", import.meta.url));

// Exercise Raycast's generated executable using the same JSON argument protocol as its bindings.
export function callSwift(operation, ...args) {
  const stdout = execFileSync(executable, [operation, ...args.map((arg) => JSON.stringify(arg))], {
    encoding: "utf8",
    stdio: "pipe",
    timeout: 90_000,
  }).trim();
  return stdout ? JSON.parse(stdout) : null;
}

export function redactImage({
  inputPath = null,
  outputPath,
  style = "blackout",
  padding = "4",
  categories = "email,phone,card,secret,ip,name,face",
  extraWords = "",
  recognition = "fast",
  customRegex = "",
}) {
  return callSwift(
    "redactImage",
    outputPath,
    style,
    padding,
    categories,
    extraWords,
    recognition,
    customRegex,
    inputPath,
  );
}
