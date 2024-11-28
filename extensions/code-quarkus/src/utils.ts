import { Configuration } from "./models/Configuration";
import { BASE_URL } from "./api";

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
