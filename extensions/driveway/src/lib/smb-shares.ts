import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function parseShares(output: string): string[] {
  const shares: string[] = [];

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("-") || line.startsWith("Share") || /shares? listed/i.test(line)) continue;

    const [name, type] = line.split(/\s{2,}/);
    // Skip administrative shares (print$, IPC$, C$): always present, never wanted.
    if (name && type === "Disk" && !name.endsWith("$")) {
      shares.push(name);
    }
  }

  return shares;
}

const SMBUTIL_TIMEOUT_MS = 10_000;

// The timeout is required: without a TTY, smbutil can block forever on a
// password prompt that never appears.
async function view(target: string, extraFlags: string[] = []): Promise<string> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/smbutil", ["-v", "view", ...extraFlags, "-f", target], {
      timeout: SMBUTIL_TIMEOUT_MS,
    });
    return stdout;
  } catch (error) {
    const execError = error as { killed?: boolean; stderr?: string };
    const stderr = execError.stderr?.trim() ?? "";
    console.error("smbutil view failed", stderr || error);

    if (execError.killed) throw new Error("Timed out listing shares.");
    // The same outcomes viewWithPassword distinguishes, named the same way.
    if (/connection failed|no route to host|not responding|operation timed out/i.test(stderr)) {
      throw new Error("Couldn't reach this host.");
    }
    throw new Error("This host won't list its shares without a username and password.");
  }
}

const EXPECT_TIMEOUT_S = Math.ceil(SMBUTIL_TIMEOUT_MS / 1000);
// Distinct from anything smbutil returns, so a prompt that never arrived
// is not reported as a rejected password.
const PROMPT_TIMEOUT_EXIT = 120;

// Tcl substitutes inside double quotes, so escape anything that could start
// a substitution or close the string early.
function tclQuote(value: string): string {
  return value.replace(/[\\$"[\]]/g, (char) => `\\${char}`);
}

// `man smbutil` gives view only -A, -N, -G, -g, -a and -f, with the password
// inside the URL, where any process running as this user can read it from the
// process arguments for as long as smbutil runs. So its prompt is answered
// over a pty instead: the password reaches expect on stdin and is written to
// the terminal smbutil reads from, appearing in neither process's arguments
// nor its environment.
function viewWithPassword(target: string, password: string): Promise<string> {
  const script = [
    `set timeout ${EXPECT_TIMEOUT_S}`,
    // Nothing reaches our stdout except the lines collected below.
    "log_user 0",
    `spawn /usr/bin/smbutil -v view -f "${tclQuote(target)}"`,
    "set captured {}",
    "expect {",
    `  -re {[Pp]assword[^\\r\\n]*:} { send -- "${tclQuote(password)}\\r"; exp_continue }`,
    "  -re {[^\\r\\n]*\\r?\\n} { append captured $expect_out(0,string); exp_continue }",
    `  timeout { exit ${PROMPT_TIMEOUT_EXIT} }`,
    "  eof {}",
    "}",
    "puts -nonewline $captured",
    // Propagate smbutil's own status, so a rejected login still throws.
    "catch wait result",
    "exit [lindex $result 3]",
  ].join("\n");

  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/expect", ["-"], { timeout: SMBUTIL_TIMEOUT_MS + 5_000 });
    let stdout = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      // The captured text came from a terminal the password was typed into, so
      // it is matched against but never surfaced. Three failures look alike
      // from the outside, and saying which one it was saves a lot of guessing.
      if (code === PROMPT_TIMEOUT_EXIT) {
        reject(new Error("Timed out waiting for a password prompt from smbutil."));
      } else if (/connection failed|no route to host|not responding/i.test(stdout)) {
        reject(new Error("Couldn't reach this host."));
      } else {
        reject(new Error("The server rejected that username and password."));
      }
    });
    child.stdin.end(script);
  });
}

// Enumeration is itself authenticated, so this throws on a bad host or
// credentials.
//
// With no password, -N is the only option: `man smbutil` documents it purely
// as "don't prompt", not as a Keychain lookup, so it succeeds only where the
// server can authenticate this user without one. That is what lets a host be
// listed without sending it a stored credential it has no claim to.
//
// With a password there is nothing to gain from trying -N first: it cannot
// use the password, and failing costs a full connect and authentication
// round trip before the real attempt even starts.
export async function listShares(host: string, user: string, password?: string): Promise<string[]> {
  const target = user ? `//${user}@${host}` : `//${host}`;
  return parseShares(password ? await viewWithPassword(target, password) : await view(target, ["-N"]));
}
