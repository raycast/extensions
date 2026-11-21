// ─────────────────────────────────────────────────────────────────────
// service-restart.mjs — pure restart-decision logic for Switcheroo.
//
// Zero runtime dependencies. Safe to unit test with node:test.
// The decision of WHICH launchctl command to run (and when to refuse)
// is isolated here so it can be tested without real launchctl calls.
// service.ts delegates to runServiceRestart() with injected helpers.
//
// STANDALONE RESTART STRATEGY:
//   For loaded standalone services, we use `launchctl kill SIGTERM`
//   (graceful) rather than `kickstart -k` (SIGKILL). The daemon handles
//   SIGTERM to unwind and clean up owned hidutil mappings. With
//   KeepAlive=true in the plist, launchd relaunches the daemon after
//   the old process exits. We verify KeepAlive=true before issuing
//   the kill. If KeepAlive is false or missing, we abort — killing
//   without relaunch would leave the user without a daemon.
//
//   We also re-validate the loaded program identity immediately before
//   the kill (TOCTOU protection), matching the Homebrew branch's
//   pre-kickstart recheck.
//
//   The result reports "Restart requested" (not "completed") because the
//   graceful restart is asynchronous — launchd handles relaunch.
//
// HOMEBREW RESTART:
//   Preserved as-is: identity-verified `kickstart -k`. This is the
//   pre-existing behavior and is NOT widened or changed.
// ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ServiceInfo
 * @property {"standalone" | "homebrew"} layout
 * @property {string} label
 * @property {string} executable
 */

/**
 * @typedef {Object} RestartDeps
 * @property {() => ServiceInfo | null} detectLayout
 * @property {() => boolean} plistIsStandalone
 * @property {() => boolean} plistKeepAlive - verify KeepAlive=true in plist
 * @property {(uid: string, label: string) => string | null} getLoadedProgram
 * @property {() => string | null} getHomebrewExec
 * @property {() => string} getUid
 * @property {() => string} getStandalonePlistPath - exact absolute plist path
 * @property {(cmd: string, args: string[], opts?: object) => string} exec
 */

/**
 * @typedef {Object} RestartResult
 * @property {string} command - the launchctl subcommand ("kill" | "bootstrap" | "kickstart")
 * @property {string[]} args - full argument list passed to launchctl
 * @property {string} label - the service label acted upon
 * @property {"loaded" | "absent"} reason - why this command was chosen
 * @property {string} message - human-readable status
 */

/**
 * Validate that a path is absolute and not a placeholder/sentinel.
 * @param {string} path
 * @throws {Error} if path is not absolute or is a known placeholder
 */
function validateAbsolutePath(path) {
  if (!path || typeof path !== "string") {
    throw new Error("Path is required and must be a string");
  }
  if (!path.startsWith("/")) {
    throw new Error(`Path must be absolute: ${path}`);
  }
  if (path.includes("<") || path.includes(">")) {
    throw new Error(`Path contains placeholder/sentinel: ${path}`);
  }
}

/**
 * Decide and execute the restart action for the Switcheroo service.
 *
 * Returns a description of the command that was run (for testing).
 * Throws on refusal (ambiguous layout, identity check failure, TOCTOU).
 *
 * @param {RestartDeps} deps - injected dependencies (all real I/O isolated)
 * @returns {RestartResult}
 */
export function runServiceRestart(deps) {
  const uid = deps.getUid();
  const info = deps.detectLayout();

  if (info === null) {
    // No service loaded — check if standalone plist is valid for bootstrap.
    if (!deps.plistIsStandalone()) {
      const hbExec = deps.getHomebrewExec();
      if (hbExec) {
        throw new Error(
          "Switcheroo is not running. Start it with: brew services start switcheroo",
        );
      }
      throw new Error(
        "Switcheroo is not installed or not running. Install via `brew install switcheroo` or run ./install.sh.",
      );
    }
    // Bootstrap with the EXACT verified standalone plist path.
    const plistPath = deps.getStandalonePlistPath();
    validateAbsolutePath(plistPath);
    const args = ["bootstrap", `gui/${uid}`, plistPath];
    deps.exec("/bin/launchctl", args, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return {
      command: "bootstrap",
      args,
      label: "standalone",
      reason: "absent",
      message: "Switcheroo bootstrapped",
    };
  }

  if (info.layout === "standalone") {
    // Identity verification: plist must be genuine standalone.
    if (!deps.plistIsStandalone()) {
      throw new Error(
        `Refusing to restart ${info.label}: plist validation failed`,
      );
    }

    // KeepAlive check: the daemon plist must have KeepAlive=true for
    // graceful SIGTERM + relaunch to work. Without it, killing the
    // daemon leaves the user without a running service.
    if (!deps.plistKeepAlive()) {
      throw new Error(
        `Refusing to restart ${info.label}: plist does not have KeepAlive=true. ` +
          "The daemon would not relaunch after graceful termination. " +
          "Use Edit Config or reinstall to fix the plist.",
      );
    }

    // TOCTOU re-check: verify the loaded program hasn't changed since
    // detectLayout ran. This matches the Homebrew branch's pre-kickstart
    // identity re-verification.
    const currentProg = deps.getLoadedProgram(uid, info.label);
    if (currentProg !== info.executable) {
      throw new Error(
        `Refusing to restart ${info.label}: loaded program changed (TOCTOU)`,
      );
    }

    // Graceful restart: kill SIGTERM so the daemon's SIGTERM handler
    // cleans up hidutil mappings. With KeepAlive=true, launchd
    // relaunches the daemon automatically.
    const args = ["kill", "SIGTERM", `gui/${uid}/${info.label}`];
    deps.exec("/bin/launchctl", args, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return {
      command: "kill",
      args,
      label: info.label,
      reason: "loaded",
      message: "Restart requested (graceful SIGTERM, KeepAlive will relaunch)",
    };
  }

  if (info.layout === "homebrew") {
    // Homebrew: pre-existing identity-verified kickstart -k.
    // This branch is NOT changed — the Homebrew lifecycle is managed
    // by `brew services` and `kickstart -k` is the documented restart.
    const currentProg = deps.getLoadedProgram(uid, info.label);
    if (currentProg !== info.executable) {
      throw new Error(
        `Refusing to kickstart ${info.label}: loaded program changed (TOCTOU)`,
      );
    }
    const args = ["kickstart", "-k", `gui/${uid}/${info.label}`];
    deps.exec("/bin/launchctl", args, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return {
      command: "kickstart",
      args,
      label: info.label,
      reason: "loaded",
      message: "Switcheroo restarted",
    };
  }

  // Should be unreachable (layout is "standalone" | "homebrew")
  throw new Error(`Unknown layout: ${info.layout}`);
}
