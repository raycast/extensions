export class TailscaleBinaryNotFoundError extends Error {
  constructor(readonly binaryPath: string) {
    super(`Could not find the Tailscale CLI at "${binaryPath}".`);
    this.name = "TailscaleBinaryNotFoundError";
  }
}

export class TailscaleCommandError extends Error {
  constructor(
    message: string,
    readonly command: string,
    readonly args: string[],
    readonly exitCode: number | null,
    readonly stdout: string,
    readonly stderr: string,
  ) {
    super(message);
    this.name = "TailscaleCommandError";
  }
}
