import { CLIError, BinaryNotFoundError, ServiceUnavailableError } from "../core/errors";

describe("CLIError", () => {
  it("stores message, exitCode, stderr, and args", () => {
    const error = new CLIError("command failed", 1, "some stderr", ["server", "list"]);
    expect(error.message).toBe("command failed");
    expect(error.exitCode).toBe(1);
    expect(error.stderr).toBe("some stderr");
    expect(error.args).toEqual(["server", "list"]);
    expect(error.name).toBe("CLIError");
  });

  it("extends Error", () => {
    const error = new CLIError("fail", 2, "", []);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CLIError);
  });

  it("supports null exitCode for non-process errors", () => {
    const error = new CLIError("parse error", null, "", ["server", "show", "abc"]);
    expect(error.exitCode).toBeNull();
  });
});

describe("BinaryNotFoundError", () => {
  it("extends CLIError with install instructions", () => {
    const error = new BinaryNotFoundError("/usr/local/bin/openstack");
    expect(error).toBeInstanceOf(CLIError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("BinaryNotFoundError");
    expect(error.message).toBe(
      "openstack CLI binary not found at '/usr/local/bin/openstack'. Install it with: pip install python-openstackclient",
    );
    expect(error.exitCode).toBeNull();
    expect(error.stderr).toBe("");
    expect(error.args).toEqual([]);
  });

  it("includes the binary path in the message", () => {
    const error = new BinaryNotFoundError("~/.venv/bin/openstack");
    expect(error.message).toContain("~/.venv/bin/openstack");
  });
});

describe("ServiceUnavailableError", () => {
  it("stores serviceType and builds message", () => {
    const error = new ServiceUnavailableError("container-infra");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ServiceUnavailableError");
    expect(error.serviceType).toBe("container-infra");
    expect(error.message).toBe("Service 'container-infra' is not available in the active config's region");
  });

  it("is not an instance of CLIError", () => {
    const error = new ServiceUnavailableError("magnum");
    expect(error).not.toBeInstanceOf(CLIError);
  });
});
