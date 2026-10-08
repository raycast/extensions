import { environment, LocalStorage } from "@raycast/api";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
	access,
	appendFile,
	chmod,
	lstat,
	mkdir,
	readFile,
	readdir,
	realpath,
	rename,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { basename, delimiter, dirname, join, normalize, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { ExecutableSource } from "./models";
import { downloadRelease, FXCodexRelease } from "./releases";

const selectedPathKey = "selected-executable-path-v2";
const registrationsKey = "executable-registrations-v2";
const legacySourceKey = "executable-source";
const legacyExternalPathKey = "external-executable-path";
const legacyManagedPathKey = "managed-external-executable-path";
const executableName = "fxcodex";
const brewFormula = "capturecontext/tap/fxcodex";
const executeFile = promisify(execFile);

export type ExecutableDestination = "user" | "extension" | "custom" | "homebrew";
export type ExecutableInstallMethod = "direct" | "homebrew";

export interface ExecutableRegistration {
	path: string;
	managed: boolean;
	destination: ExecutableDestination;
	method?: ExecutableInstallMethod;
	version?: string;
	installedAt?: string;
}

export interface ExecutableInstallation extends ExecutableRegistration {
	isInstalled: boolean;
	isSelected: boolean;
	isRegistered: boolean;
	isSymbolicLink: boolean;
	resolvedPath?: string;
	location: string;
}

export interface ExecutableResolution {
	source: ExecutableSource;
	path: string;
	isInstalled: boolean;
	isManaged: boolean;
	automaticUpdatesDisabled: boolean;
	installation?: ExecutableRegistration;
}

export type InstallDestination =
	| { kind: "user" }
	| { kind: "extension" }
	| { kind: "custom"; directory: string }
	| { kind: "homebrew" }
	| { kind: "replace"; path: string; destination: ExecutableDestination };

export function userExecutablePath(): string {
	return join(homedir(), ".local", "bin", executableName);
}

export function extensionExecutablesDirectory(): string {
	return join(environment.supportPath, "executables");
}

export async function selectedExecutableSource(): Promise<ExecutableSource> {
	const selected = await storedSelectedPath();
	if (selected) return selected;

	const discovered = (await listExecutables()).find((executable) => executable.isInstalled);
	return discovered?.path ?? userExecutablePath();
}

export async function selectExecutableSource(source: ExecutableSource): Promise<void> {
	const path = normalizedExecutablePath(source);
	if (!(await isExecutable(path))) throw new Error("The selected fxcodex file is not executable.");
	await LocalStorage.setItem(selectedPathKey, path);
}

export async function resolveExecutable(source?: ExecutableSource): Promise<ExecutableResolution> {
	const path = normalizedExecutablePath(await resolvedSource(source));
	const registration = (await readRegistrations()).find((item) => item.path === path);
	const automaticUpdatesDisabled = await isExtensionLocalExecutable(path);
	return {
		source: path,
		path,
		isInstalled: await isExecutable(path),
		isManaged: registration?.managed === true,
		automaticUpdatesDisabled,
		...(registration ? { installation: registration } : {}),
	};
}

export async function listExecutables(): Promise<ExecutableInstallation[]> {
	const [selected, registrations, extensionInstallations] = await Promise.all([
		storedSelectedPath(),
		readRegistrations(),
		discoverExtensionExecutables(),
	]);
	const registeredByPath = new Map(registrations.map((registration) => [registration.path, registration]));
	const pathDirectories = executableSearchDirectories();
	const candidates = [
		selected,
		...registrations.map((registration) => registration.path),
		userExecutablePath(),
		"/opt/homebrew/bin/fxcodex",
		"/usr/local/bin/fxcodex",
		...extensionInstallations,
		...pathDirectories.map((directory) => join(directory, executableName)),
	].filter((value): value is string => Boolean(value));

	const installations = await Promise.all(
		[...new Set(candidates.map(normalizedExecutablePath))].map(
			async (path): Promise<ExecutableInstallation | undefined> => {
				const registration = registeredByPath.get(path);
				const [installed, symbolicLink] = await Promise.all([isExecutable(path), inspectSymbolicLink(path)]);
				if (!installed && !registration && path !== selected) return undefined;
				const destination = registration?.destination ?? (await inferredDestination(path));
				const isExtensionManaged = destination === "extension";
				const isHomebrewManaged = destination === "homebrew";
				return {
					path,
					managed: registration?.managed ?? (isExtensionManaged || isHomebrewManaged),
					destination,
					...(registration?.method
						? { method: registration.method }
						: isHomebrewManaged
							? { method: "homebrew" as const }
							: isExtensionManaged
								? { method: "direct" as const }
								: {}),
					...(registration?.version
						? { version: registration.version }
						: isExtensionManaged
							? { version: basename(dirname(path)) }
							: {}),
					...(registration?.installedAt ? { installedAt: registration.installedAt } : {}),
					isInstalled: installed,
					isSelected: path === selected || (!selected && false),
					isRegistered: registration !== undefined,
					isSymbolicLink: symbolicLink.isSymbolicLink,
					...(symbolicLink.resolvedPath ? { resolvedPath: symbolicLink.resolvedPath } : {}),
					location: destinationLabel(destination),
				};
			},
		),
	);

	const available = installations.filter((value): value is ExecutableInstallation => value !== undefined);
	if (!selected) {
		const firstInstalled = available.find((installation) => installation.isInstalled);
		if (firstInstalled) firstInstalled.isSelected = true;
	}
	return available.sort((lhs, rhs) => {
		if (lhs.isSelected !== rhs.isSelected) return lhs.isSelected ? -1 : 1;
		if (lhs.isInstalled !== rhs.isInstalled) return lhs.isInstalled ? -1 : 1;
		return lhs.path.localeCompare(rhs.path);
	});
}

async function discoverExtensionExecutables(): Promise<string[]> {
	try {
		const entries = await readdir(extensionExecutablesDirectory(), { withFileTypes: true });
		return entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => join(extensionExecutablesDirectory(), entry.name, executableName));
	} catch (error) {
		if (isRecord(error) && error.code === "ENOENT") return [];
		throw error;
	}
}

export async function setExternalExecutablePath(path: string): Promise<void> {
	const executablePath = normalizedExecutablePath(path);
	if (basename(executablePath) !== executableName)
		throw new Error(`The selected executable must be named ${executableName}.`);
	if (!(await isExecutable(executablePath))) throw new Error("The selected fxcodex file is not executable.");

	const registrations = await readRegistrations();
	if (!registrations.some((registration) => registration.path === executablePath)) {
		registrations.push({
			path: executablePath,
			managed: false,
			destination: "custom",
		});
		await writeRegistrations(registrations);
	}
	await selectExecutableSource(executablePath);
}

export async function installRelease(
	release: FXCodexRelease,
	destination: InstallDestination,
	addToPath: boolean,
): Promise<string> {
	if (destination.kind === "homebrew") return installWithHomebrew(release);

	const destinationPath = installPath(release.version, destination);
	const resolvedDestination = directDestination(destination);
	const { executable } = await downloadRelease(release);
	await mkdir(dirname(destinationPath), { recursive: true });
	const temporaryPath = join(dirname(destinationPath), `.${executableName}-${randomUUID()}.tmp`);

	try {
		await writeFile(temporaryPath, executable);
		await chmod(temporaryPath, 0o755);
		await validateDownloadedExecutable(temporaryPath, release.version);
		if (addToPath && (resolvedDestination === "user" || resolvedDestination === "custom")) {
			await ensureDirectoryOnPath(dirname(destinationPath));
		}
		await rename(temporaryPath, destinationPath);
	} catch (error) {
		await rm(temporaryPath, { force: true });
		throw error;
	}

	await upsertRegistration({
		path: destinationPath,
		managed: true,
		destination: resolvedDestination,
		method: "direct",
		version: release.version,
		installedAt: new Date().toISOString(),
	});
	await selectExecutableSource(destinationPath);
	return destinationPath;
}

export async function updateHomebrewExecutable(): Promise<string> {
	const brew = await requireBrewExecutable();
	try {
		await runBrew(brew, ["upgrade", executableName]);
	} catch (error) {
		if (!isAlreadyCurrentBrewError(error)) throw error;
	}
	const path = await homebrewInstalledExecutable(brew);
	await upsertRegistration({
		path,
		managed: true,
		destination: "homebrew",
		method: "homebrew",
		version: await readExecutableVersion(path),
		installedAt: new Date().toISOString(),
	});
	await selectExecutableSource(path);
	return path;
}

export async function uninstallExecutable(path: string): Promise<void> {
	const executablePath = normalizedExecutablePath(path);
	const registration = (await readRegistrations()).find((item) => item.path === executablePath);
	const isUnregisteredExtensionInstall = !registration && isWithin(executablePath, extensionExecutablesDirectory());
	const isUnregisteredHomebrewInstall = !registration && (await inferredDestination(executablePath)) === "homebrew";
	if (!registration?.managed && !isUnregisteredExtensionInstall && !isUnregisteredHomebrewInstall) {
		throw new Error("Only an executable installed through this extension can be uninstalled here.");
	}

	if (registration?.method === "homebrew" || isUnregisteredHomebrewInstall) {
		const brew = await requireBrewExecutable();
		await runBrew(brew, ["uninstall", executableName]);
	} else {
		await rm(executablePath, { force: true });
	}
	await removeRegistration(executablePath);
	if ((await storedSelectedPath()) === executablePath) await LocalStorage.removeItem(selectedPathKey);
}

export async function forgetExecutable(path: string): Promise<void> {
	const executablePath = normalizedExecutablePath(path);
	const registration = (await readRegistrations()).find((item) => item.path === executablePath);
	if (registration?.managed) throw new Error("Uninstall an extension-managed executable instead of forgetting it.");
	await removeRegistration(executablePath);
	if ((await storedSelectedPath()) === executablePath) await LocalStorage.removeItem(selectedPathKey);
}

export async function executablePreferences(): Promise<{
	selectedPath?: string;
	registrations: ExecutableRegistration[];
	searchPath: string[];
}> {
	const [selectedPath, registrations] = await Promise.all([storedSelectedPath(), readRegistrations()]);
	return { selectedPath, registrations, searchPath: executableSearchDirectories() };
}

export async function findBrewExecutable(): Promise<string | undefined> {
	const candidates = [
		...executableSearchDirectories().map((directory) => join(directory, "brew")),
		"/opt/homebrew/bin/brew",
		"/usr/local/bin/brew",
	];
	for (const candidate of new Set(candidates.map(normalizedExecutablePath))) {
		if (await isExecutable(candidate)) return candidate;
	}
	return undefined;
}

function executableSearchDirectories(): string[] {
	return [
		...new Set(
			(process.env.PATH ?? "")
				.split(delimiter)
				.map((path) => path.trim())
				.filter(Boolean)
				.map((path) => normalize(path)),
		),
	];
}

async function resolvedSource(source?: ExecutableSource): Promise<string> {
	return source || selectedExecutableSource();
}

async function storedSelectedPath(): Promise<string | undefined> {
	const selected = await LocalStorage.getItem<string>(selectedPathKey);
	if (selected) return normalizedExecutablePath(selected);

	const [legacySource, legacyExternalPath] = await Promise.all([
		LocalStorage.getItem<string>(legacySourceKey),
		LocalStorage.getItem<string>(legacyExternalPathKey),
	]);
	return legacySource === "external" && legacyExternalPath ? normalizedExecutablePath(legacyExternalPath) : undefined;
}

async function readRegistrations(): Promise<ExecutableRegistration[]> {
	const stored = await LocalStorage.getItem<string>(registrationsKey);
	let registrations: ExecutableRegistration[] = [];
	if (stored) {
		try {
			const value: unknown = JSON.parse(stored);
			if (Array.isArray(value)) registrations = value.flatMap(parseRegistration);
		} catch {
			// Ignore malformed extension-local catalog data and rebuild it from discovery.
		}
	}

	const [legacyPath, legacyManagedPath] = await Promise.all([
		LocalStorage.getItem<string>(legacyExternalPathKey),
		LocalStorage.getItem<string>(legacyManagedPathKey),
	]);
	if (legacyPath && !registrations.some((registration) => registration.path === normalizedExecutablePath(legacyPath))) {
		registrations.push({
			path: normalizedExecutablePath(legacyPath),
			managed: legacyPath === legacyManagedPath,
			destination: normalizedExecutablePath(legacyPath) === userExecutablePath() ? "user" : "custom",
			...(legacyPath === legacyManagedPath ? { method: "direct" as const } : {}),
		});
	}
	return registrations;
}

function parseRegistration(value: unknown): ExecutableRegistration[] {
	if (!isRecord(value) || typeof value.path !== "string" || typeof value.managed !== "boolean") return [];
	if (!isDestination(value.destination)) return [];
	return [
		{
			path: normalizedExecutablePath(value.path),
			managed: value.managed,
			destination: value.destination,
			...(value.method === "direct" || value.method === "homebrew" ? { method: value.method } : {}),
			...(typeof value.version === "string" ? { version: value.version } : {}),
			...(typeof value.installedAt === "string" ? { installedAt: value.installedAt } : {}),
		},
	];
}

async function writeRegistrations(registrations: ExecutableRegistration[]): Promise<void> {
	await Promise.all([
		LocalStorage.setItem(registrationsKey, JSON.stringify(registrations)),
		LocalStorage.removeItem(legacySourceKey),
		LocalStorage.removeItem(legacyExternalPathKey),
		LocalStorage.removeItem(legacyManagedPathKey),
	]);
}

async function upsertRegistration(registration: ExecutableRegistration): Promise<void> {
	const registrations = (await readRegistrations()).filter((item) => item.path !== registration.path);
	registrations.push(registration);
	await writeRegistrations(registrations);
}

async function removeRegistration(path: string): Promise<void> {
	await writeRegistrations((await readRegistrations()).filter((registration) => registration.path !== path));
}

async function inferredDestination(path: string): Promise<ExecutableDestination> {
	if (path === userExecutablePath()) return "user";
	if (isWithin(path, extensionExecutablesDirectory())) return "extension";
	try {
		const resolved = await realpath(path);
		if (resolved.includes(`${sep}Cellar${sep}${executableName}${sep}`)) return "homebrew";
	} catch {
		// The caller already records missing selected and registered paths.
	}
	return "custom";
}

function destinationLabel(destination: ExecutableDestination): string {
	switch (destination) {
		case "user":
			return "User installation";
		case "extension":
			return "Extension support";
		case "homebrew":
			return "Homebrew";
		case "custom":
			return "PATH or custom location";
	}
}

function installPath(version: string, destination: Exclude<InstallDestination, { kind: "homebrew" }>): string {
	switch (destination.kind) {
		case "user":
			return userExecutablePath();
		case "extension":
			return join(extensionExecutablesDirectory(), version, executableName);
		case "custom":
			if (!destination.directory.trim()) throw new Error("Choose a custom installation directory.");
			return normalizedExecutablePath(join(destination.directory, executableName));
		case "replace":
			return normalizedExecutablePath(destination.path);
	}
}

function directDestination(destination: Exclude<InstallDestination, { kind: "homebrew" }>): ExecutableDestination {
	return destination.kind === "replace" ? destination.destination : destination.kind;
}

async function validateDownloadedExecutable(path: string, expectedVersion: string): Promise<void> {
	try {
		await executeFile("/usr/bin/codesign", ["--verify", "--strict", path]);
	} catch (error) {
		throw new Error(`The downloaded executable has an invalid code signature: ${processError(error)}`);
	}

	try {
		const { stdout } = await executeFile(path, ["version"], {
			env: { ...process.env, FXCODEX_JSON: "-1", FXCODEX_DISABLE_AUTO_UPDATE: "1" },
			timeout: 30_000,
		});
		if (stdout.trim() !== expectedVersion) {
			throw new Error(`expected ${expectedVersion}, received ${stdout.trim() || "no version"}`);
		}
	} catch (error) {
		throw new Error(`The downloaded executable failed its version check: ${processError(error)}`);
	}
}

async function installWithHomebrew(release: FXCodexRelease): Promise<string> {
	if (release.isPrerelease) throw new Error("Homebrew only installs the latest stable fxCodex release.");
	const brew = await requireBrewExecutable();
	if (await isHomebrewFormulaInstalled(brew)) {
		try {
			await runBrew(brew, ["upgrade", executableName]);
		} catch (error) {
			if (!isAlreadyCurrentBrewError(error)) throw error;
		}
	} else {
		await runBrew(brew, ["install", brewFormula]);
	}
	const path = await homebrewInstalledExecutable(brew);
	await upsertRegistration({
		path,
		managed: true,
		destination: "homebrew",
		method: "homebrew",
		version: await readExecutableVersion(path),
		installedAt: new Date().toISOString(),
	});
	await selectExecutableSource(path);
	return path;
}

async function isHomebrewFormulaInstalled(brew: string): Promise<boolean> {
	try {
		await runBrew(brew, ["list", "--versions", executableName]);
		return true;
	} catch {
		return false;
	}
}

function isAlreadyCurrentBrewError(error: unknown): boolean {
	const message = String(error);
	return message.includes("already installed") || message.includes("already up-to-date");
}

async function requireBrewExecutable(): Promise<string> {
	const brew = await findBrewExecutable();
	if (!brew) throw new Error("Homebrew was not found in PATH, /opt/homebrew/bin, or /usr/local/bin.");
	return brew;
}

async function homebrewInstalledExecutable(brew: string): Promise<string> {
	const linked = join(dirname(brew), executableName);
	if (await isExecutable(linked)) return normalizedExecutablePath(linked);

	const { stdout } = await runBrew(brew, ["--prefix", executableName]);
	const installed = join(stdout.trim(), "bin", executableName);
	if (!(await isExecutable(installed))) throw new Error("Homebrew completed but its fxcodex executable was not found.");
	return normalizedExecutablePath(installed);
}

async function runBrew(brew: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
	try {
		return await executeFile(brew, args, { env: process.env, timeout: 10 * 60_000 });
	} catch (error) {
		throw new Error(`Homebrew failed: ${processError(error)}`);
	}
}

async function readExecutableVersion(path: string): Promise<string> {
	const { stdout } = await executeFile(path, ["version"], {
		env: { ...process.env, FXCODEX_JSON: "-1", FXCODEX_DISABLE_AUTO_UPDATE: "1" },
		timeout: 30_000,
	});
	return stdout.trim();
}

async function ensureDirectoryOnPath(directory: string): Promise<void> {
	if (executableSearchDirectories().includes(normalize(directory))) return;

	const shell = basename(process.env.SHELL ?? "zsh");
	const profile =
		shell === "zsh"
			? join(homedir(), ".zprofile")
			: shell === "bash"
				? join(homedir(), ".bash_profile")
				: join(homedir(), ".profile");
	let contents = "";
	try {
		contents = await readFile(profile, "utf8");
	} catch (error) {
		if (!isRecord(error) || error.code !== "ENOENT") throw error;
	}
	if (
		contents.includes(directory) ||
		(directory === join(homedir(), ".local", "bin") && contents.includes(".local/bin"))
	) {
		return;
	}

	const pathValue = directory === join(homedir(), ".local", "bin") ? '"$HOME/.local/bin"' : shellQuote(directory);
	const prefix = contents.length > 0 && !contents.endsWith("\n") ? "\n" : "";
	await appendFile(profile, `${prefix}\n# Added by the fxCodex Raycast extension\nexport PATH=${pathValue}:"$PATH"\n`);
}

function shellQuote(value: string): string {
	return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function normalizedExecutablePath(path: string): string {
	return resolve(path);
}

function isWithin(path: string, directory: string): boolean {
	const relative = normalizedExecutablePath(path).slice(normalizedExecutablePath(directory).length);
	return relative.startsWith(sep);
}

async function isExecutable(path: string): Promise<boolean> {
	try {
		const metadata = await stat(path);
		await access(path, constants.X_OK);
		return metadata.isFile();
	} catch {
		return false;
	}
}

async function inspectSymbolicLink(path: string): Promise<{ isSymbolicLink: boolean; resolvedPath?: string }> {
	try {
		const metadata = await lstat(path);
		if (!metadata.isSymbolicLink()) return { isSymbolicLink: false };
		return { isSymbolicLink: true, resolvedPath: await realpath(path) };
	} catch {
		return { isSymbolicLink: false };
	}
}

async function isExtensionLocalExecutable(path: string): Promise<boolean> {
	if (isWithin(path, extensionExecutablesDirectory())) return true;
	try {
		return isWithin(await realpath(path), extensionExecutablesDirectory());
	} catch {
		return false;
	}
}

function isDestination(value: unknown): value is ExecutableDestination {
	return value === "user" || value === "extension" || value === "custom" || value === "homebrew";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function processError(error: unknown): string {
	if (!isRecord(error)) return String(error);
	const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
	const message = error instanceof Error ? error.message : String(error);
	return stderr || message;
}
