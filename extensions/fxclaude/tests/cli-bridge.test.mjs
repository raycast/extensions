import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, symlink, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const originalHome = process.env.FXCLAUDE_HOME;
let fixture;
let bridge;
let selectedExecutable;

before(async () => {
	fixture = await mkdtemp(join(root, ".test-build-"));
	process.env.FXCLAUDE_HOME = join(fixture, "profiles with spaces");
	await claimRunningClaudeInstances(process.env.FXCLAUDE_HOME);
	const assetsPath = join(fixture, "assets");
	const supportPath = join(fixture, "extension-support");
	// The extension no longer bundles the CLI, so register a real executable the way a user would.
	selectedExecutable = join(fixture, "selected/fxclaude");
	await mkdir(dirname(selectedExecutable), { recursive: true });
	await symlink(testExecutable(), selectedExecutable);
	const output = join(fixture, "bridge.mjs");
	await build({
		stdin: {
			contents: `export * from "./src/lib/client";
				export * from "./src/lib/dashboard";
				export * from "./src/lib/workspace-icons";
				export * from "./src/lib/executable";
				export * from "./src/lib/diagnostics";
				export * from "./src/lib/links";`,
			resolveDir: root,
		},
		bundle: true,
		platform: "node",
		format: "esm",
		outfile: output,
		plugins: [
			{
				name: "raycast-test-host",
				setup(build) {
					build.onResolve({ filter: /^@raycast\/api$/ }, () => ({ path: "api", namespace: "test-host" }));
					build.onLoad({ filter: /.*/, namespace: "test-host" }, () => ({
						contents: `export const environment = ${JSON.stringify({ assetsPath, supportPath })};
						export const Icon = { Folder: "folder-16", House: "house-16", Star: "star-16" };
						export const Toast = { Style: { Animated: "animated", Success: "success", Failure: "failure" } };
						export const showToast = async () => ({});
						export const Image = { Mask: { RoundedRectangle: "rounded" } };
						const storage = new Map();
						export const LocalStorage = {
							getItem: async key => storage.get(key),
							setItem: async (key, value) => storage.set(key, value),
							removeItem: async key => storage.delete(key),
						};`,
					}));
				},
			},
		],
	});
	bridge = await import(pathToFileURL(output).href);
	await bridge.setExternalExecutablePath(selectedExecutable);
});

after(async () => {
	if (originalHome === undefined) delete process.env.FXCLAUDE_HOME;
	else process.env.FXCLAUDE_HOME = originalHome;
	if (fixture) await rm(fixture, { recursive: true, force: true });
});

test("the selected CLI loads a healthy dashboard without Codex-only status fields", async () => {
	assert.equal((await bridge.resolveExecutable()).isInstalled, true);
	const dashboard = await bridge.loadDashboard();
	assert.deepEqual(dashboard.issues, []);
	assert.equal(dashboard.executablePath, selectedExecutable);
	assert.equal(dashboard.status.currentWorkspace, "primary");
	assert.deepEqual(dashboard.workspaceIcons, {});
	assert.match(dashboard.version, /^\d+\.\d+\.\d+$/);
});

test("workspace creation, selection, icons, erase, and deletion use the real CLI", async () => {
	const { data: workspace } = await bridge.invoke(["workspace", "create", "bridge-test", "--use"]);
	assert.equal(workspace.kind, "managed");
	assert.ok(workspace.userDataURL);
	assert.equal(workspace.claudeHomeURL, undefined);
	assert.ok(workspace.claudeConfigURL);
	await bridge.setRaycastWorkspaceIcon(workspace.id, "star-16");
	let dashboard = await bridge.loadDashboard();
	assert.deepEqual(dashboard.issues, []);
	assert.equal(dashboard.status.currentWorkspaceID, workspace.id);
	assert.deepEqual(dashboard.workspaceIcons[workspace.id], { type: "raycast", value: "star-16" });

	const source = join(root, "assets/extension-icon.png");
	await bridge.setCustomWorkspaceIcon(workspace.id, source, source, true);
	dashboard = await bridge.loadDashboard();
	assert.deepEqual(dashboard.issues, []);
	const icon = dashboard.workspaceIcons[workspace.id];
	assert.equal(icon.type, "custom");
	assert.equal(icon.rounded, true);
	await access(icon.anyAppearancePath);
	await access(icon.darkAppearancePath);
	assert.notEqual(icon.anyAppearancePath, source);

	const attributes = await bridge.getIntegrationAttribute("raycast", `workspaces.[key: ${workspace.id}].icon`);
	assert.equal(attributes.any_appearance, icon.anyAppearancePath);
	assert.equal(attributes.dark_appearance, icon.darkAppearancePath);
	assert.equal(attributes.anyAppearance, undefined);

	await bridge.invoke(["erase", workspace.name, "--yes"]);
	assert.deepEqual((await bridge.loadDashboard()).workspaceIcons[workspace.id], icon);
	await bridge.invoke(["delete", workspace.name, "--yes"]);
	await bridge.removeWorkspaceIcon(workspace.id, icon);
	await assert.rejects(access(icon.anyAppearancePath));
	await access(source);
	assert.equal((await bridge.loadDashboard()).status.currentWorkspace, "primary");
});

test("opaque attribute keys and client errors survive the JSON bridge", async () => {
	const value = { custom_key: { account_id: "example", any_appearance: "path" } };
	await bridge.setIntegrationAttribute("tests", "opaque", value);
	assert.deepEqual(await bridge.getIntegrationAttribute("tests", "opaque"), value);
	await bridge.removeIntegrationAttribute("tests", "opaque");
	await assert.rejects(
		bridge.getIntegrationAttribute("tests", "opaque"),
		(error) => error.code === "integration_attribute_not_found",
	);
	await assert.rejects(
		bridge.invoke(["delete", "primary", "--yes"]),
		(error) => error.code === "primary_workspace_mutation",
	);
});

test("another registered executable uses the same workspace store and diagnostics respect its support root", async () => {
	const external = join(fixture, "external/fxclaude");
	await mkdir(dirname(external), { recursive: true });
	await symlink(testExecutable(), external);
	await bridge.setExternalExecutablePath(external);
	const dashboard = await bridge.loadDashboard();
	assert.deepEqual(dashboard.issues, []);
	assert.equal(dashboard.executablePath, external);
	assert.equal((await bridge.collectDirectDiagnostics(dashboard)).storage.supportDirectory, process.env.FXCLAUDE_HOME);
	// Discovery also reports installations already on this Mac, so only require the registered ones.
	const listed = (await bridge.listExecutables()).map((installation) => installation.path);
	assert.ok(listed.includes(external) && listed.includes(selectedExecutable), listed.join(", "));
	await bridge.selectExecutableSource(selectedExecutable);
});

test("an absent optional application URL is reported as not installed", () => {
	const issues = [];
	const status = bridge.parseStatus(
		{
			currentWorkspace: "primary",
			currentWorkspaceID: "00000000-0000-0000-0000-000000000001",
			supportDirectoryURL: "file:///tmp/fxclaude/",
			workspaces: [],
		},
		issues,
	);
	assert.equal(status.applicationURL, null);
	assert.deepEqual(issues, []);
});

test("only Claude app links are pre-filled from text", () => {
	assert.equal(bridge.appLinkCandidate("  claude://login/callback?code=1 \n"), "claude://login/callback?code=1");
	assert.equal(bridge.appLinkCandidate("CLAUDE://open"), "CLAUDE://open");
	assert.equal(
		bridge.appLinkCandidate("msauth.com.anthropic.claudefordesktop://auth"),
		"msauth.com.anthropic.claudefordesktop://auth",
	);
	assert.equal(bridge.appLinkCandidate("https://claude.ai"), undefined);
	assert.equal(bridge.appLinkCandidate("codex://open"), undefined);
	assert.equal(bridge.appLinkCandidate("not a link"), undefined);
	assert.equal(bridge.appLinkCandidate(""), undefined);
	assert.equal(bridge.appLinkCandidate(undefined), undefined);
});

test("opening a link reports CLI errors without delivering anything", async () => {
	await assert.rejects(bridge.openLink("missing-workspace", "claude://open"), (error) => {
		assert.notEqual(error.code, "unsupported_command");
		assert.match(error.message, /missing-workspace/);
		return true;
	});
	await assert.rejects(bridge.openLink("primary", "https://claude.ai"), (error) => {
		assert.notEqual(error.code, "unsupported_command");
		return true;
	});
});

test("an executable without open-url gets an explanatory error", async () => {
	const external = join(fixture, "legacy/fxclaude");
	await mkdir(dirname(external), { recursive: true });
	await writeFile(
		external,
		"#!/bin/sh\nprintf \"Error: 3 unexpected arguments: 'open-url', 'work', 'claude://open'\\n\" >&2\nexit 64\n",
		{ mode: 0o755 },
	);
	await assert.rejects(
		bridge.openLink("work", "claude://open", external),
		(error) => error.code === "unsupported_command" && /cannot open links/.test(error.message),
	);
});

// The scratch store has no records for Claude instances already open on this Mac. With more
// than one running, `status` cannot tell which is primary and reports an error, so the tests
// would depend on the host. Record each running instance under a placeholder workspace ID,
// in the format fxclaude writes, so the CLI treats them as belonging to other workspaces.
async function claimRunningClaudeInstances(home) {
	const instances = Object.fromEntries(
		runningClaudeInstances().map((instance) => [
			randomUUID(),
			{
				bundle_url: `${pathToFileURL(instance.bundlePath).href}/`,
				launch_date: instance.launchDate.toISOString().replace(/\.\d{3}Z$/, "Z"),
				process_id: instance.processID,
			},
		]),
	);
	await mkdir(home, { recursive: true, mode: 0o700 });
	await writeFile(join(home, "runtime.json"), JSON.stringify({ schema_version: "2.0", instances }));
}

function runningClaudeInstances() {
	const output = execFileSync("ps", ["-axo", "pid=,lstart=,command="], {
		encoding: "utf8",
		env: { ...process.env, LC_ALL: "C" },
	});
	return output.split("\n").flatMap((line) => {
		// `lstart` is five fields in the C locale, such as "Sat Nov 14 03:55:56 2026".
		const match = line.match(/^\s*(\d+)\s+(\w+ \w+\s+\d+ [\d:]+ \d+)\s+(.+?\.app)\/Contents\/MacOS\/Claude(?: |$)/);
		// Helpers live in bundles nested inside Claude.app and are not app instances.
		if (!match || match[3].includes(".app/")) return [];
		return [
			{
				processID: Number(match[1]),
				launchDate: new Date(match[2]),
				bundlePath: match[3],
			},
		];
	});
}

// FXCLAUDE_TEST_EXECUTABLE wins; otherwise use the sibling Swift package's build (`make test` keeps the
// debug build current) or an fxclaude on PATH.
function testExecutable() {
	const candidates = [
		process.env.FXCLAUDE_TEST_EXECUTABLE,
		resolve(root, "../../../Projects/fxClaude/fxclaude/.build/debug/fxclaude"),
		resolve(root, "../../../Projects/fxClaude/fxclaude/.build/release/fxclaude"),
		whichFxclaude(),
	].filter(Boolean);
	const executable = candidates.find((candidate) => existsSync(candidate));
	if (!executable) throw new Error("No fxclaude executable found. Set FXCLAUDE_TEST_EXECUTABLE to one.");
	return resolve(executable);
}

function whichFxclaude() {
	try {
		return execFileSync("which", ["fxclaude"], { encoding: "utf8" }).trim() || undefined;
	} catch {
		return undefined;
	}
}
