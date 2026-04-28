/**
 * Error types for the openstack-manager extension.
 *
 * CLIError: Base error for all openstack CLI failures (non-zero exit, parse errors).
 * BinaryNotFoundError: Thrown when the openstack binary is not found (ENOENT).
 * ServiceUnavailableError: Thrown when a service (e.g., Magnum) is not available in the region.
 */

export class CLIError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number | null,
    public readonly stderr: string,
    public readonly args: string[],
  ) {
    super(message);
    this.name = "CLIError";
  }
}

export class BinaryNotFoundError extends CLIError {
  constructor(binaryPath: string) {
    super(
      `openstack CLI binary not found at '${binaryPath}'. Install it with: pip install python-openstackclient`,
      null,
      "",
      [],
    );
    this.name = "BinaryNotFoundError";
  }
}

export class ServiceUnavailableError extends Error {
  constructor(public readonly serviceType: string) {
    super(`Service '${serviceType}' is not available in the active config's region`);
    this.name = "ServiceUnavailableError";
  }
}
