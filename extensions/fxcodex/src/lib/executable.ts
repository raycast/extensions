import { environment, LocalStorage } from "@raycast/api";
import { constants } from "node:fs";
import { access, chmod, copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { ExecutableSource } from "./models";

const sourceKey = "executable-source";
const externalPathKey = "external-executable-path";
const managedExternalPathKey = "managed-external-executable-path";

export interface ExecutableResolution {
	source: ExecutableSource;
	path: string;
	isInstalled: boolean;
	isManaged: boolean;
}

export function bundledExecutablePath(): string {
	return join(environment.assetsPath, "bin", "fxcodex");
}

export async function selectedExecutableSource(): Promise<ExecutableSource> {
	const source = await LocalStorage.getItem<string>(sourceKey);
	return source === "external" ? "external" : "bundled";
}

export async function selectExecutableSource(source: ExecutableSource): Promise<void> {
	await LocalStorage.setItem(sourceKey, source);
}

export async function resolveExecutable(source?: ExecutableSource): Promise<ExecutableResolution> {
	const resolvedSource = source ?? (await selectedExecutableSource());
	if (resolvedSource === "bundled") {
		const path = bundledExecutablePath();
		return {
			source: resolvedSource,
			path,
			isInstalled: await isExecutable(path),
			isManaged: false,
		};
	}

	const path = await discoverExternalExecutable();
	const managedPath = await LocalStorage.getItem<string>(managedExternalPathKey);
	return {
		source: resolvedSource,
		path: path ?? join(homedir(), ".local", "bin", "fxcodex"),
		isInstalled: path !== undefined,
		isManaged: path !== undefined && path === managedPath,
	};
}

export async function setExternalExecutablePath(path: string): Promise<void> {
	if (basename(path) !== "fxcodex") {
		throw new Error("The selected executable must be named fxcodex.");
	}
	if (!(await isExecutable(path))) {
		throw new Error("The selected fxcodex file is not executable.");
	}
	await LocalStorage.setItem(externalPathKey, path);
}

export async function installExternalExecutable(): Promise<string> {
	const source = bundledExecutablePath();
	const destination = join(homedir(), ".local", "bin", "fxcodex");
	await mkdir(dirname(destination), { recursive: true });
	await copyFile(source, destination);
	await chmod(destination, 0o755);
	await LocalStorage.setItem(externalPathKey, destination);
	await LocalStorage.setItem(managedExternalPathKey, destination);
	return destination;
}

export async function uninstallExternalExecutable(): Promise<void> {
	const resolution = await resolveExecutable("external");
	if (!resolution.isManaged) {
		throw new Error("Only an external executable installed by this extension can be uninstalled here.");
	}
	await rm(resolution.path);
	await LocalStorage.removeItem(externalPathKey);
	await LocalStorage.removeItem(managedExternalPathKey);
	await selectExecutableSource("bundled");
}

export async function verifyBundledChecksum(): Promise<boolean> {
	const executable = await readFile(bundledExecutablePath());
	const checksumContents = await readFile(`${bundledExecutablePath()}.sha256`, "utf8");
	const expected = checksumContents.trim().split(/\s+/)[0]?.toLowerCase();
	const actual = createHash("sha256").update(executable).digest("hex");
	return expected?.length === 64 && expected === actual;
}

export async function executablePreferences(): Promise<{
	selectedSource: ExecutableSource;
	configuredExternalPath?: string;
	managedExternalPath?: string;
}> {
	const [selectedSource, configuredExternalPath, managedExternalPath] = await Promise.all([
		selectedExecutableSource(),
		LocalStorage.getItem<string>(externalPathKey),
		LocalStorage.getItem<string>(managedExternalPathKey),
	]);
	return {
		selectedSource,
		configuredExternalPath,
		managedExternalPath,
	};
}

async function discoverExternalExecutable(): Promise<string | undefined> {
	const configured = await LocalStorage.getItem<string>(externalPathKey);
	const candidates = [
		configured,
		join(homedir(), ".local", "bin", "fxcodex"),
		"/opt/homebrew/bin/fxcodex",
		"/usr/local/bin/fxcodex",
	].filter((value): value is string => Boolean(value));

	for (const candidate of [...new Set(candidates)]) {
		if (basename(candidate) === "fxcodex" && (await isExecutable(candidate))) {
			return candidate;
		}
	}
	return undefined;
}

async function isExecutable(path: string): Promise<boolean> {
	try {
		await access(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}
