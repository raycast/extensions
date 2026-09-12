import { Configuration } from "./models/Configuration";
import { BASE_URL } from "./api";
import AdmZip from "adm-zip";

import { exec } from "child_process";
import { Application } from "@raycast/api";

export type IDE = "intellij" | "vscode" | "vscodium";

export function openInIDE(directoryPath: string, ide: Application) {
  console.log(`Opening project with ${ide.name} from directory ${directoryPath}`);
  const command = `open -a "${ide.path}" "${directoryPath}"`;
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error opening ${ide.name}: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`${ide.name} stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

export function unzipFile(zipFilePath: string, destinationDir: string) {
  try {
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(destinationDir, true);
    console.log("Extraction complete");
    return true;
  } catch (error) {
    console.error(`Error extracting zip (${zipFilePath}):`, error);
    return false;
  }
}

export function getParams(config: Configuration): URLSearchParams {
  const params = new URLSearchParams();

  // Add the required fields
  params.set("j", config.javaVersion);
  params.set("S", config.quarkusVersion);
  params.set("cn", "code.quarkus.io");

  // Add build tool
  params.set("b", config.buildTool);

  // Add group ID, artifact ID, and version if provided
  if (config.group) params.set("g", config.group);
  if (config.artifact) params.set("a", config.artifact);

  // Add starter code flag
  params.set("nc", config.starterCode ? "false" : "true");
  params.set("v", config.version);

  // Add dependencies
  if (config.dependencies) {
    config.dependencies.forEach((dependency) => {
      params.append("e", dependency);
    });
  }

  // Return the generated URL
  return params;
}

export function getCodeQuarkusUrl(config: Configuration): string {
  return `${BASE_URL}?${getParams(config).toString()}`;
}
