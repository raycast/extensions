import { environment, Icon, LocalStorage } from "@raycast/api";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

const storageKey = "workspace-icons";
const supportedExtensions = new Set([".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const raycastIconValues = new Set<Icon>(Object.values(Icon));

export type WorkspaceIcon = { type: "raycast"; value: Icon } | { type: "custom"; path: string };

type StoredWorkspaceIcon = { type: "raycast"; value: Icon } | { type: "custom"; fileName: string };

type WorkspaceIconRecords = Record<string, StoredWorkspaceIcon>;

export async function loadWorkspaceIcons(workspaceNames: string[]): Promise<Record<string, WorkspaceIcon>> {
	const records = await loadRecords();
	const currentNames = new Set(workspaceNames);
	const icons: Record<string, WorkspaceIcon> = {};
	let changed = false;

	for (const [workspaceName, icon] of Object.entries(records)) {
		if (!currentNames.has(workspaceName)) {
			await removeStoredFile(icon);
			delete records[workspaceName];
			changed = true;
			continue;
		}

		if (icon.type === "raycast") {
			icons[workspaceName] = icon;
			continue;
		}

		const path = iconPath(icon.fileName);
		try {
			await access(path);
			icons[workspaceName] = { type: "custom", path };
		} catch {
			delete records[workspaceName];
			changed = true;
		}
	}

	if (changed) await saveRecords(records);
	return icons;
}

export async function setRaycastWorkspaceIcon(workspaceName: string, value: Icon): Promise<void> {
	const records = await loadRecords();
	await removeStoredFile(records[workspaceName]);
	records[workspaceName] = { type: "raycast", value };
	await saveRecords(records);
}

export async function setCustomWorkspaceIcon(workspaceName: string, sourcePath: string): Promise<void> {
	const source = resolve(sourcePath);
	const sourceStat = await stat(source);
	if (!sourceStat.isFile()) throw new Error("The selected workspace icon must be a file.");

	const extension = extname(source).toLowerCase();
	if (!supportedExtensions.has(extension)) {
		throw new Error("Choose a PNG, JPEG, GIF, WebP, or SVG image.");
	}

	const records = await loadRecords();
	const previousIcon = records[workspaceName];
	const fileName = workspaceIconFileName(workspaceName, extension);
	const destination = iconPath(fileName);
	await mkdir(iconsDirectory(), { recursive: true });
	if (source !== destination) await copyFile(source, destination);
	if (previousIcon?.type === "custom" && previousIcon.fileName !== fileName) {
		await removeStoredFile(previousIcon);
	}
	records[workspaceName] = { type: "custom", fileName };
	await saveRecords(records);
}

export async function removeWorkspaceIcon(workspaceName: string): Promise<void> {
	const records = await loadRecords();
	const icon = records[workspaceName];
	if (!icon) return;
	await removeStoredFile(icon);
	delete records[workspaceName];
	await saveRecords(records);
}

export async function renameWorkspaceIcon(oldName: string, newName: string): Promise<void> {
	if (oldName === newName) return;

	const records = await loadRecords();
	const icon = records[oldName];
	if (!icon) return;

	await removeStoredFile(records[newName]);
	delete records[oldName];
	if (icon.type === "raycast") {
		records[newName] = icon;
	} else {
		const newFileName = workspaceIconFileName(newName, extname(icon.fileName));
		await mkdir(iconsDirectory(), { recursive: true });
		await rename(iconPath(icon.fileName), iconPath(newFileName));
		records[newName] = { type: "custom", fileName: newFileName };
	}
	await saveRecords(records);
}

function iconsDirectory(): string {
	return join(environment.supportPath, "workspace-icons");
}

function iconPath(fileName: string): string {
	return join(iconsDirectory(), basename(fileName));
}

function workspaceIconFileName(workspaceName: string, extension: string): string {
	const digest = createHash("sha256").update(workspaceName).digest("hex");
	return `${digest}${extension}`;
}

async function removeStoredFile(icon: StoredWorkspaceIcon | undefined): Promise<void> {
	if (icon?.type === "custom") await rm(iconPath(icon.fileName), { force: true });
}

async function loadRecords(): Promise<WorkspaceIconRecords> {
	const value = await LocalStorage.getItem<string>(storageKey);
	if (!value) return {};
	try {
		const parsed: unknown = JSON.parse(value);
		if (!isRecord(parsed)) return {};
		const records: WorkspaceIconRecords = {};
		for (const [workspaceName, value] of Object.entries(parsed)) {
			const icon = parseStoredIcon(value);
			if (icon) records[workspaceName] = icon;
		}
		return records;
	} catch {
		return {};
	}
}

function parseStoredIcon(value: unknown): StoredWorkspaceIcon | undefined {
	if (typeof value === "string" && basename(value) === value) {
		return { type: "custom", fileName: value };
	}
	if (!isRecord(value)) return undefined;
	if (value.type === "raycast" && typeof value.value === "string" && raycastIconValues.has(value.value as Icon)) {
		return { type: "raycast", value: value.value as Icon };
	}
	if (value.type === "custom" && typeof value.fileName === "string" && basename(value.fileName) === value.fileName) {
		return { type: "custom", fileName: value.fileName };
	}
	return undefined;
}

async function saveRecords(records: WorkspaceIconRecords): Promise<void> {
	if (Object.keys(records).length === 0) {
		await LocalStorage.removeItem(storageKey);
		return;
	}
	await LocalStorage.setItem(storageKey, JSON.stringify(records));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
