/**
 * Pins for the curated failure-pattern catalog — each case is a verbatim
 * winget wording observed in the wild, mapped to a short user-facing message.
 * These ran against WingetProgressDetector.getResult() in the previous
 * implementation; result interpretation now lives in
 * parser.interpretOperationResult (exit-code-first, patterns refine messages).
 */

import { describe, expect, it } from "vitest";

import { interpretOperationResult } from "./parser";

/** Unknown nonzero exit; the message must come from the curated pattern. */
function failureMessage(output: string): string | undefined {
  const result = interpretOperationResult(1, output);
  expect(result.success).toBe(false);
  return result.message;
}

describe("upgrade failure messages", () => {
  it("detects installer technology mismatch", () => {
    expect(
      failureMessage(
        "A newer version was found, but the install technology is different from the current version installed. " +
          "Please uninstall the package and install the newer version.\n",
      ),
    ).toBe("Installer type changed, uninstall first");
  });

  it("detects installer technology mismatch with real winget spinner output (exit code 43)", () => {
    const raw =
      "\r   - \r   \\ \r   | \r   / \r   - \r   \\ \r" +
      "                                                                                                                        " +
      "\r\r   - \r   \\ \r   | \r   / \r   - \r" +
      "                                                                                                                        " +
      "\rA newer version was found, but the install technology is different from the current version installed. " +
      "Please uninstall the package and install the newer version.\r\n";

    const result = interpretOperationResult(43, raw);
    expect(result.success).toBe(false);
    expect(result.message).toBe("Installer type changed, uninstall first");
  });

  it("detects not-applicable upgrade (system/requirements mismatch)", () => {
    expect(
      failureMessage(
        "No applicable upgrade found. A newer package version is available in a configured source, " +
          "but it does not apply to your system or requirements.\n",
      ),
    ).toBe("Newer version not compatible with this system");
  });

  it("detects pinned package blocking upgrade", () => {
    expect(
      failureMessage("A newer version was found, but the package has a pin that prevents from upgrading it.\n"),
    ).toBe("Blocked by pin");
  });

  it("detects package that cannot be upgraded via winget", () => {
    expect(
      failureMessage(
        "The package cannot be upgraded using winget. Please use the method provided by the publisher for upgrading this package.\n",
      ),
    ).toBe("Not upgradable via WinGet");
  });
});

describe("installer and compatibility failures", () => {
  it("detects installer blocked by policy", () => {
    expect(failureMessage("The installer is blocked by policy\n")).toBe("Installer blocked by policy");
  });

  it("detects security check failure", () => {
    expect(failureMessage("The installer failed security check\n")).toBe("Blocked by security/antivirus");
  });

  it("detects admin context incompatibility", () => {
    expect(failureMessage("The installer cannot be run from an administrator context.\n")).toBe(
      "Cannot run as admin, run Raycast unelevated",
    );
  });

  it("detects a modified portable package refusing removal", () => {
    expect(
      failureMessage("Unable to remove Portable package as it has been modified; to override this check use --force\n"),
    ).toBe("Portable package was modified since install");
  });

  it("detects missing administrator privileges", () => {
    expect(failureMessage("The package installation failed because administrator privileges are required.\n")).toBe(
      "Requires administrator, retry from an elevated terminal",
    );
  });

  it("keeps access-denied distinct from the requires-administrator class", () => {
    // "Access is denied" is usually a locked file or ACL problem; it must not
    // trigger the elevation retry in commands.ts.
    expect(failureMessage("Access is denied.\n")).toBe("Access denied");
  });
});

describe("resource and environment failures", () => {
  it("detects out of memory", () => {
    expect(failureMessage("There's not enough memory available to install.\n")).toBe("Out of memory");
  });

  it("detects disk space (alternative wording)", () => {
    expect(failureMessage("There's no more space on your PC. Make space, then try again.\n")).toBe("Disk full");
  });

  it("detects network requirement", () => {
    expect(failureMessage("This application requires internet connectivity.\n")).toBe("No internet connection");
  });
});

describe("policy and agreement failures", () => {
  it("detects organization policy block", () => {
    expect(failureMessage("Organization policies are preventing installation. Contact your admin.\n")).toBe(
      "Blocked by org policy",
    );
  });

  it("detects package agreement not accepted", () => {
    expect(failureMessage("Package agreements were not agreed to. Operation cancelled.\n")).toBe(
      "License not accepted",
    );
  });

  it("detects source agreement not accepted", () => {
    expect(failureMessage("One or more of the source agreements were not agreed to. Operation cancelled.\n")).toBe(
      "Source agreement not accepted",
    );
  });
});

describe("uninstall-specific failures", () => {
  it("detects missing uninstall command", () => {
    expect(failureMessage("winget cannot locate the uninstall command for this package.\n")).toBe(
      "Uninstaller not found",
    );
  });

  it("detects multiple versions installed", () => {
    expect(
      failureMessage(
        "Multiple versions of this package are installed. Either refine the search, pass the `--version` argument to select one, or pass the `--all-versions` flag to uninstall all of them.\n",
      ),
    ).toBe("Multiple versions installed, uninstall each version from Show Installed");
  });
});

describe("other failure types", () => {
  it("detects Microsoft Store policy block", () => {
    expect(
      failureMessage(
        "Failed to install or upgrade Microsoft Store package because the specific app is blocked by policy\n",
      ),
    ).toBe("Store app blocked by policy");
  });

  it("detects reboot required (pattern path, unknown exit code)", () => {
    expect(failureMessage("Restart your PC to finish installation.\n")).toBe("Restart required");
  });

  it("detects archive extraction failure", () => {
    expect(failureMessage("Failed to extract the contents of the archive\n")).toBe("Archive extraction failed");
  });

  it("detects app currently running (alternative wording)", () => {
    expect(failureMessage("Application is currently running. Exit the application then try again.\n")).toBe(
      "App in use, close it first",
    );
  });
});

describe("embedded error details", () => {
  it("extracts installer exit code and log path", () => {
    const output = `Starting package install...
You cancelled the installation.
Installer failed with exit code: 2
Installer log is available at: C:\\Users\\user\\AppData\\Local\\Packages\\...\\Git.Git.log
`;
    const result = interpretOperationResult(1, output);
    expect(result.success).toBe(false);
    expect(result.message).toContain("Installer failed with exit code 2");
    expect(result.errorCode).toBe("2");
    expect(result.installerLogPath).toContain("Git.Git.log");
  });

  it("extracts winget error code and message", () => {
    const output = `An unexpected error occurred while executing the command:
0x8a15000f : Data required by the source is missing
`;
    const result = interpretOperationResult(1, output);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("0x8A15000F");
    expect(result.message).toContain("Data required by the source is missing");
  });
});
