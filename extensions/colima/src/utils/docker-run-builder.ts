export interface DockerRunFormValues {
  rawCommand: string;
  image: string;
  containerName: string;
  ports: string;
  envVars: string;
  volumes: string;
  network: string;
  restartPolicy: string;
  detached: boolean;
  additionalFlags: string;
}

export function parseRawCommand(rawCommand: string): string {
  const cmd = rawCommand.trim();
  return cmd.replace(/^docker\s+run\s*/, "");
}

export function buildDockerRunArgs(values: DockerRunFormValues): { args: string[]; useShell: boolean } {
  if (values.rawCommand && values.rawCommand.trim()) {
    return { args: ["run", parseRawCommand(values.rawCommand)], useShell: true };
  }

  const args: string[] = ["run"];

  if (values.detached) {
    args.push("-d");
  }

  if (values.containerName && values.containerName.trim()) {
    args.push("--name", values.containerName.trim());
  }

  if (values.ports && values.ports.trim()) {
    const portMappings = values.ports
      .split(",")
      .map((port) => port.trim())
      .filter(Boolean);

    for (const port of portMappings) {
      args.push("-p", port);
    }
  }

  if (values.envVars && values.envVars.trim()) {
    const envLines = values.envVars
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const env of envLines) {
      args.push("-e", env);
    }
  }

  if (values.volumes && values.volumes.trim()) {
    const volumeLines = values.volumes
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const volume of volumeLines) {
      args.push("-v", volume);
    }
  }

  if (values.network && values.network !== "default") {
    args.push("--network", values.network);
  }

  if (values.restartPolicy && values.restartPolicy !== "no") {
    args.push("--restart", values.restartPolicy);
  }

  if (values.additionalFlags && values.additionalFlags.trim()) {
    const extraFlags = values.additionalFlags.trim().split(/\s+/);
    args.push(...extraFlags);
  }

  args.push(values.image.trim());

  return { args, useShell: false };
}
