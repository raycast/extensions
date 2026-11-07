import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const originalHome = process.env.FXCLAUDE_HOME;
let fixture;
let bridge;

before(async () => {
	fixture = await mkdtemp(join(root, ".test-build-"));
	process.env.FXCLAUDE_HOME = join(fixture, "profiles with spaces");
	const assetsPath = join(fixture, "assets");
	const supportPath = join(fixture, "extension-support");
	await mkdir(join(assetsPath, "bin"), { recursive: true });
	const executable = resolve(process.env.FXCLAUDE_TEST_EXECUTABLE || join(root, "assets/bin/fxclaude"));
	await symlink(executable, join(assetsPath, "bin/fxclaude"));
	const checksum = createHash("sha256")
		.update(await readFile(executable))
		.digest("hex");
	await writeFile(join(assetsPath, "bin/fxclaude.sha256"), `${checksum}  fxclaude\n`);
	const output = join(fixture, "bridge.mjs");
	await build({
		stdin: {
			contents: `export * from "./src/lib/client";
				export * from "./src/lib/dashboard";
				export * from "./src/lib/workspace-icons";
				export * from "./src/lib/executable";
				export * from "./src/lib/diagnostics";`,
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
});

after(async () => {
	if (originalHome === undefined) delete process.env.FXCLAUDE_HOME;
	else process.env.FXCLAUDE_HOME = originalHome;
	if (fixture) await rm(fixture, { recursive: true, force: true });
});

test("bundled CLI loads a healthy dashboard without Codex-only status fields", async () => {
	assert.equal(await bridge.verifyBundledChecksum(), true);
	const dashboard = await bridge.loadDashboard();
	assert.deepEqual(dashboard.issues, []);
	assert.equal(dashboard.source, "bundled");
	assert.equal(dashboard.status.currentWorkspace, "primary");
	assert.deepEqual(dashboard.workspaceIcons, {});
	assert.match(dashboard.version, /^\d+\.\d+\.\d+$/);
});

test("workspace creation, selection, icons, erase, and deletion use the real CLI", async () => {
	const { data: workspace } = await bridge.invoke(["workspace", "create", "bridge-test", "--use"]);
	assert.equal(workspace.kind, "managed");
	assert.ok(workspace.userDataURL);
	assert.equal(workspace.claudeHomeURL, undefined);
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

test("an external executable uses the same workspace store and diagnostics respect its support root", async () => {
	const external = join(fixture, "external/fxclaude");
	await mkdir(dirname(external), { recursive: true });
	await symlink((await bridge.resolveExecutable("bundled")).path, external);
	await bridge.setExternalExecutablePath(external);
	await bridge.selectExecutableSource("external");
	const dashboard = await bridge.loadDashboard();
	assert.deepEqual(dashboard.issues, []);
	assert.equal(dashboard.source, "external");
	assert.equal(dashboard.executablePath, external);
	assert.equal((await bridge.collectDirectDiagnostics(dashboard)).storage.supportDirectory, process.env.FXCLAUDE_HOME);
	await bridge.selectExecutableSource("bundled");
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
