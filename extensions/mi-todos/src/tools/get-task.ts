import * as fs from "fs";
import * as path from "path";
import * as os from "os";

type Input = {
  /**
   * The name of the MiToDos file to read (without .md extension), e.g. "inbox" or "content-os"
   */
  name: string;
};

export default async function (input: Input) {
  const mitodosDir = path.join(os.homedir(), "MiToDos");

  try {
    if (!fs.existsSync(mitodosDir)) {
      return "MiToDos directory not found at ~/MiToDos/";
    }

    const filepath = path.join(mitodosDir, `${input.name}.md`);

    if (!fs.existsSync(filepath)) {
      return `File not found: ${input.name}.md. Available files: ${fs
        .readdirSync(mitodosDir)
        .filter((f: string) => f.endsWith(".md"))
        .map((f: string) => f.replace(".md", ""))
        .join(", ")}`;
    }

    const content = fs.readFileSync(filepath, "utf-8");
    return content;
  } catch (error) {
    return `Error reading MiToDos file: ${String(error)}`;
  }
}
