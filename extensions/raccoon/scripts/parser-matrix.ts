/**
 * Cross-check: every `rcc <cmd> --json` output, captured under several
 * environments, fed to the SAME parser the Raycast extension uses.
 *
 * A generic JSON.parse only proves the bytes are syntactically a document.
 * This proves the extension can actually read it — so it catches schema drift,
 * not only syntax breakage.
 *
 * Run from raycast-extension/:  npm run test:matrix -- /path/to/rcc
 *
 * Not part of `npm test`: it takes a minute and needs a real rcc on this Mac.
 * Run it before a release, against both the repo's rcc and the installed one.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

// Mirrors RUNTIME_PATH in src/rcc.ts. Not imported: rcc.ts pulls in @raycast/api,
// which only resolves inside Raycast. Keep the two lists in step.
const RUNTIME_PATH = [
	"/opt/homebrew/bin",
	"/usr/local/bin",
	`${homedir()}/.local/bin`,
	"/usr/bin",
	"/bin",
	"/usr/sbin",
	"/sbin",
].join(":");
import { parseBackup } from "../src/backup-json.ts";
import { parseBattery } from "../src/battery-json.ts";
import { parseCerts } from "../src/certs-json.ts";
import { parseDisk } from "../src/disk-json.ts";
import { parseDocker } from "../src/docker-json.ts";
import { parseEnv } from "../src/env-json.ts";
import { parseFonts } from "../src/fonts-json.ts";
import { parseGit } from "../src/git-json.ts";
import { parseHistory } from "../src/history-json.ts";
import { parseMemory } from "../src/memory-json.ts";
import { parseNetwork } from "../src/network-json.ts";
import { parsePorts } from "../src/ports-json.ts";
import { parseSsh } from "../src/ssh-json.ts";
import { parseStartup } from "../src/startup-json.ts";
import { parseXcode } from "../src/xcode-json.ts";
import { parseTrash, parseWifi, parseOverlap } from "../src/simple-json.ts";

const execFileAsync = promisify(execFile);
const RCC = process.argv[2] ?? "rcc";

const PARSERS: Record<string, (s: string) => unknown> = {
	backup: parseBackup,
	battery: parseBattery,
	certs: parseCerts,
	disk: parseDisk,
	docker: parseDocker,
	env: parseEnv,
	fonts: parseFonts,
	git: parseGit,
	history: parseHistory,
	memory: parseMemory,
	network: parseNetwork,
	ports: parsePorts,
	ssh: parseSsh,
	startup: parseStartup,
	xcode: parseXcode,
	trash: parseTrash,
	wifi: parseWifi,
	overlap: parseOverlap,
};

const emptyHome = mkdtempSync(join(tmpdir(), "rcc-empty-home-"));
const base = { ...process.env, NO_COLOR: "1", PATH: RUNTIME_PATH };
const noHome = { ...base };
delete noHome.HOME;

const ENVS: Record<string, NodeJS.ProcessEnv> = {
	// Exactly what the extension hands rcc today.
	extension: base,
	// A spawned process is not guaranteed HOME.
	"no HOME": noHome,
	// HOME exists but holds nothing — a fresh account, a sandbox.
	"empty HOME": { ...base, HOME: emptyHome },
	// /usr/sbin missing: netstat, diskutil, networksetup all disappear.
	"PATH without /usr/sbin": { ...base, PATH: "/usr/bin:/bin" },
	// Only the system directories: no Homebrew, no user bin.
	"system PATH only": { ...base, PATH: "/usr/bin:/bin:/usr/sbin:/sbin" },
};

type Failure = { cmd: string; env: string; kind: string; detail: string };
const failures: Failure[] = [];
let cells = 0;
let declined = 0;

for (const [cmd, parse] of Object.entries(PARSERS)) {
	for (const [envName, env] of Object.entries(ENVS)) {
		cells++;
		let stdout = "";
		try {
			({ stdout } = await execFileAsync(RCC, [cmd, "--json"], {
				env,
				maxBuffer: 10 * 1024 * 1024,
				timeout: 120_000,
			}));
		} catch (e) {
			// A non-zero exit still hands us stdout; rcc reports absence as data.
			const failed = e as {
				stdout?: string;
				stderr?: string;
				code?: number;
			};
			stdout = failed.stdout ?? "";
			// Exit 3 with "Not checked" is rcc declining to answer because a
			// tool is off the PATH: no document on purpose, and the honest
			// outcome for the environments below that hide /usr/sbin.
			if (failed.code === 3 && /Not checked/.test(failed.stderr ?? "")) {
				declined++;
				continue;
			}
			if (!stdout.trim()) {
				failures.push({
					cmd,
					env: envName,
					kind: "no output",
					detail: String((e as Error).message).slice(0, 120),
				});
				continue;
			}
		}

		if (!stdout.trim()) {
			failures.push({
				cmd,
				env: envName,
				kind: "empty stdout",
				detail: "0 bytes",
			});
			continue;
		}

		// The shape of the `network` bug: a bare number on a line of its own.
		const lines = stdout.split("\n");
		const stray = lines.findIndex(
			(l) => /^\s*-?\d+(\.\d+)?\s*$/.test(l) && l.trim() !== "",
		);
		if (stray >= 0) {
			failures.push({
				cmd,
				env: envName,
				kind: "stray bare number",
				detail: `line ${stray + 1}: ${JSON.stringify(lines[stray])}`,
			});
			continue;
		}

		try {
			JSON.parse(stdout);
		} catch (e) {
			failures.push({
				cmd,
				env: envName,
				kind: "not JSON",
				detail: String((e as Error).message).slice(0, 120),
			});
			continue;
		}

		try {
			parse(stdout);
		} catch (e) {
			failures.push({
				cmd,
				env: envName,
				kind: "parser rejected",
				detail: String((e as Error).message).slice(0, 160),
			});
		}
	}
}

console.log(
	`\ncells: ${cells}  declined (tool off PATH, said so): ${declined}  failures: ${failures.length}\n`,
);
for (const f of failures) {
	console.log(`FAIL  ${f.cmd} / ${f.env}\n      ${f.kind}: ${f.detail}`);
}
process.exit(failures.length === 0 ? 0 : 1);
