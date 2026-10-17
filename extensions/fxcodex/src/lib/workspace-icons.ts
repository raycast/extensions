import { environment, Icon, Image } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";
import { access, copyFile, mkdir, rm, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import {
	FXCodexInvocationError,
	getIntegrationAttribute,
	removeIntegrationAttribute,
	setIntegrationAttribute,
} from "./client";
import { ExecutableSource, Workspace } from "./models";

const supportedExtensions = new Set([".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const raycastIconValues = new Set<Icon>(Object.values(Icon));

export type WorkspaceIcon =
	| { type: "raycast"; value: Icon }
	| {
			type: "custom";
			anyAppearancePath: string;
			darkAppearancePath?: string;
			rounded: boolean;
	  };

type WorkspaceAttributes = Record<string, { icon?: unknown }>;

export async function loadWorkspaceIcons(
	workspaces: Workspace[],
	source?: ExecutableSource,
): Promise<Record<string, WorkspaceIcon>> {
	let attributes: WorkspaceAttributes;
	try {
		attributes = await getIntegrationAttribute<WorkspaceAttributes>("raycast", "workspaces", source);
	} catch (error) {
		if (error instanceof FXCodexInvocationError && error.code === "integration_attribute_not_found") return {};
		throw error;
	}

	const workspaceIDs = new Set(workspaces.map((workspace) => workspace.id));
	const icons: Record<string, WorkspaceIcon> = {};
	for (const [workspaceID, value] of Object.entries(attributes)) {
		if (!workspaceIDs.has(workspaceID)) continue;
		const icon = parseIcon(value.icon);
		if (!icon) continue;
		if (icon.type === "custom") {
			try {
				await access(icon.anyAppearancePath);
				if (icon.darkAppearancePath) await access(icon.darkAppearancePath);
			} catch {
				continue;
			}
		}
		icons[workspaceID] = icon;
	}
	return icons;
}

export async function setRaycastWorkspaceIcon(
	workspaceID: string,
	value: Icon,
	source?: ExecutableSource,
): Promise<void> {
	const previousIcon = await loadWorkspaceIcon(workspaceID, source);
	await setIntegrationAttribute("raycast", iconPath(workspaceID), { type: "raycast", value }, source);
	await removeStoredFile(previousIcon);
}

export async function setCustomWorkspaceIcon(
	workspaceID: string,
	anyAppearanceSourcePath: string,
	darkAppearanceSourcePath: string | undefined,
	rounded: boolean,
	source?: ExecutableSource,
): Promise<void> {
	const anyAppearance = await prepareCustomWorkspaceIcon(workspaceID, "any", anyAppearanceSourcePath);
	const darkAppearance = darkAppearanceSourcePath
		? await prepareCustomWorkspaceIcon(workspaceID, "dark", darkAppearanceSourcePath)
		: undefined;

	const previousIcon = await loadWorkspaceIcon(workspaceID, source);
	await mkdir(iconsDirectory(), { recursive: true });

	try {
		await copyPreparedIcon(anyAppearance);
		if (darkAppearance) await copyPreparedIcon(darkAppearance);

		await setIntegrationAttribute(
			"raycast",
			iconPath(workspaceID),
			{
				type: "custom",
				any_appearance: anyAppearance.destination,
				...(darkAppearance ? { dark_appearance: darkAppearance.destination } : {}),
				rounded,
			},
			source,
		);
	} catch (error) {
		await removeCopiedIcon(anyAppearance);
		if (darkAppearance) await removeCopiedIcon(darkAppearance);
		throw error;
	}

	await removeStoredFile(
		previousIcon,
		new Set([anyAppearance.destination, darkAppearance?.destination].filter(isString)),
	);
}

export async function removeWorkspaceIcon(
	workspaceID: string,
	selectedIcon?: WorkspaceIcon,
	source?: ExecutableSource,
): Promise<void> {
	const icon = selectedIcon ?? (await loadWorkspaceIcon(workspaceID, source));
	try {
		await removeIntegrationAttribute("raycast", iconPath(workspaceID), source);
	} catch (error) {
		if (!(error instanceof FXCodexInvocationError) || error.code !== "integration_attribute_not_found") throw error;
	}
	await removeStoredFile(icon);
}

function iconsDirectory(): string {
	return join(environment.supportPath, "workspace-icons");
}

function workspaceIconFileName(workspaceID: string, appearance: "any" | "dark", extension: string): string {
	const digest = createHash("sha256").update(workspaceID).digest("hex");
	return `${digest}-${appearance}-${randomUUID()}${extension}`;
}

function iconPath(workspaceID: string): string {
	return `workspaces.[key: ${workspaceID}].icon`;
}

async function loadWorkspaceIcon(workspaceID: string, source?: ExecutableSource): Promise<WorkspaceIcon | undefined> {
	try {
		return parseIcon(await getIntegrationAttribute<unknown>("raycast", iconPath(workspaceID), source));
	} catch (error) {
		if (error instanceof FXCodexInvocationError && error.code === "integration_attribute_not_found") return undefined;
		throw error;
	}
}

async function removeStoredFile(icon: WorkspaceIcon | undefined, preserving: Set<string> = new Set()): Promise<void> {
	if (icon?.type !== "custom") return;

	const paths = new Set(
		[icon.anyAppearancePath, icon.darkAppearancePath].filter(isString).map((path) => resolve(path)),
	);
	for (const path of paths) {
		if (!preserving.has(path) && dirname(path) === resolve(iconsDirectory())) await rm(path, { force: true });
	}
}

function parseIcon(value: unknown): WorkspaceIcon | undefined {
	if (!isRecord(value)) return undefined;
	if (value.type === "raycast" && typeof value.value === "string" && raycastIconValues.has(value.value as Icon)) {
		return { type: "raycast", value: value.value as Icon };
	}
	if (value.type === "custom") {
		const anyAppearancePath =
			typeof value.any_appearance === "string"
				? resolve(value.any_appearance)
				: typeof value.path === "string"
					? resolve(value.path)
					: undefined;
		if (!anyAppearancePath) return undefined;

		return {
			type: "custom",
			anyAppearancePath,
			...(typeof value.dark_appearance === "string" ? { darkAppearancePath: resolve(value.dark_appearance) } : {}),
			rounded: typeof value.rounded === "boolean" ? value.rounded : true,
		};
	}
	return undefined;
}

export function workspaceIconImage(icon: WorkspaceIcon | undefined, fallback: Icon): Image.ImageLike {
	if (!icon) return fallback;
	if (icon.type === "raycast") return icon.value;

	return {
		source: icon.darkAppearancePath
			? { light: icon.anyAppearancePath, dark: icon.darkAppearancePath }
			: icon.anyAppearancePath,
		...(icon.rounded ? { mask: Image.Mask.RoundedRectangle } : {}),
	};
}

interface PreparedCustomWorkspaceIcon {
	source: string;
	destination: string;
}

async function prepareCustomWorkspaceIcon(
	workspaceID: string,
	appearance: "any" | "dark",
	sourcePath: string,
): Promise<PreparedCustomWorkspaceIcon> {
	const source = resolve(sourcePath);
	const sourceStat = await stat(source);
	if (!sourceStat.isFile()) throw new Error("The selected workspace icon must be a file.");

	const extension = extname(source).toLowerCase();
	if (!supportedExtensions.has(extension)) throw new Error("Choose a PNG, JPEG, GIF, WebP, or SVG image.");

	return {
		source,
		destination: join(iconsDirectory(), workspaceIconFileName(workspaceID, appearance, extension)),
	};
}

async function copyPreparedIcon(icon: PreparedCustomWorkspaceIcon): Promise<void> {
	if (icon.source !== icon.destination) await copyFile(icon.source, icon.destination);
}

async function removeCopiedIcon(icon: PreparedCustomWorkspaceIcon): Promise<void> {
	if (icon.source !== icon.destination) await rm(icon.destination, { force: true });
}

function isString(value: string | undefined): value is string {
	return typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
