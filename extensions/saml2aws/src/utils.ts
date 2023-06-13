import { promisify } from "util";
import { exec } from "child_process";
import { readFileSync } from "fs";
import ini from "ini";

export const execCommand = async (command: string) => {
  // Execute the command
  const { stderr, stdout } = await promisify(exec)(command);
  if (stderr.length > 0) throw new Error(`Command ${command} run with errors: ${stderr}`);

  // Sanitize output
  const output = stdout.replaceAll("\n", "");

  return output;
};

export const readIniFile = (pathToFile: string) => {
  const iniString = readFileSync(pathToFile, "utf-8");
  const config = ini.parse(iniString);

  return config;
};
