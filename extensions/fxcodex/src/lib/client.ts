import { execFile } from "node:child_process";
import {
	FXCodexStatus,
	InvocationResult,
	MachineErrorResponse,
	MachineResponse,
	MachineWarningResponse,
	VersionOutput,
} from "./models";
import { ExecutableSource } from "./models";
import { resolveExecutable } from "./executable";

export class FXCodexInvocationError extends Error {
	constructor(
		message: string,
		readonly code: string = "invocation_failed",
	) {
		super(message);
	}
}

export interface RawInvocationResult {
	source: ExecutableSource;
	executablePath: string;
	args: string[];
	isInstalled: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
	error?: string;
}

export async function invoke<T>(args: string[], source?: ExecutableSource): Promise<InvocationResult<T>> {
	const executable = await resolveExecutable(source);
	if (!executable.isInstalled) {
		throw new FXCodexInvocationError(`fxCodex is not installed at ${executable.path}.`, "executable_not_found");
	}

	const result = await execute(executable.path, args, executable.automaticUpdatesDisabled);
	const warnings = parseJSONObjects(result.stderr)
		.filter((value): value is MachineWarningResponse => isRecord(value) && isRecord(value.warning))
		.map((value) => value.warning);

	if (result.exitCode !== 0) {
		const error = parseJSONObjects(result.stderr).find(isMachineError);
		throw new FXCodexInvocationError(
			(error?.error.message ?? result.stderr.trim()) || "fxCodex failed.",
			error?.error.code,
		);
	}

	let response: MachineResponse<T>;
	try {
		response = normalizeMachineJSON(JSON.parse(result.stdout)) as MachineResponse<T>;
	} catch {
		throw new FXCodexInvocationError("fxCodex returned an invalid JSON response.", "invalid_response");
	}
	if (response.apiVersion !== 1 || response.ok !== true) {
		throw new FXCodexInvocationError("fxCodex uses an unsupported machine API version.", "unsupported_api");
	}
	return { data: response.data, warnings };
}

export async function invokeRaw(args: string[], source?: ExecutableSource): Promise<RawInvocationResult> {
	const executable = await resolveExecutable(source);
	if (!executable.isInstalled) {
		return {
			source: executable.source,
			executablePath: executable.path,
			args,
			isInstalled: false,
			stdout: "",
			stderr: "",
			exitCode: 1,
			error: `fxCodex is not installed at ${executable.path}.`,
		};
	}

	const result = await execute(executable.path, args, executable.automaticUpdatesDisabled);
	return {
		source: executable.source,
		executablePath: executable.path,
		args,
		isInstalled: true,
		...result,
	};
}

export async function loadStatus(source?: ExecutableSource): Promise<InvocationResult<FXCodexStatus>> {
	return invoke<FXCodexStatus>(["status", "--all"], source);
}

export async function loadVersion(source?: ExecutableSource): Promise<InvocationResult<VersionOutput>> {
	return invoke<VersionOutput>(["version"], source);
}

export async function getIntegrationAttribute<T>(
	integration: string,
	path = "",
	source?: ExecutableSource,
): Promise<T> {
	return (await invoke<T>(["integrations", "attributes", "get", integration, "--path", path], source)).data;
}

export async function setIntegrationAttribute(
	integration: string,
	path: string,
	value: unknown,
	source?: ExecutableSource,
): Promise<void> {
	await invoke(["integrations", "attributes", "set", integration, JSON.stringify(value), "--path", path], source);
}

export async function removeIntegrationAttribute(
	integration: string,
	path: string,
	source?: ExecutableSource,
): Promise<void> {
	await invoke(["integrations", "attributes", "remove", integration, "--path", path], source);
}

function execute(
	path: string,
	args: string[],
	disableAutomaticUpdates: boolean,
): Promise<{ stdout: string; stderr: string; exitCode: number; error?: string }> {
	return new Promise((resolve) => {
		execFile(
			path,
			args,
			{
				env: {
					...process.env,
					FXCODEX_JSON: "1",
					...(disableAutomaticUpdates ? { FXCODEX_DISABLE_AUTO_UPDATE: "1" } : {}),
				},
				timeout: 60_000,
			},
			(error, stdout, stderr) => {
				resolve({
					stdout,
					stderr,
					exitCode: typeof error?.code === "number" ? error.code : error ? 1 : 0,
					error: error?.message,
				});
			},
		);
	});
}

function parseJSONObjects(text: string): unknown[] {
	const values: unknown[] = [];
	let depth = 0;
	let start = -1;
	let inString = false;
	let escaped = false;
	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];
		if (inString) {
			if (escaped) escaped = false;
			else if (character === "\\") escaped = true;
			else if (character === '"') inString = false;
			continue;
		}
		if (character === '"') inString = true;
		else if (character === "{") {
			if (depth === 0) start = index;
			depth += 1;
		} else if (character === "}") {
			depth -= 1;
			if (depth === 0 && start >= 0) {
				try {
					values.push(normalizeMachineJSON(JSON.parse(text.slice(start, index + 1))));
				} catch {
					// Ignore non-JSON diagnostic output.
				}
				start = -1;
			}
		}
	}
	return values;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function normalizeMachineJSON(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalizeMachineJSON);
	if (!isRecord(value)) return value;

	const normalized: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		const normalizedKey = machinePropertyName(key);
		normalized[normalizedKey] = normalizedKey === "integrations" ? item : normalizeMachineJSON(item);
	}
	return normalized;
}

function machinePropertyName(key: string): string {
	if (!key.includes("_")) return key;

	const [first, ...rest] = key.split("_");
	return (
		first +
		rest
			.map((component) =>
				component === "id" || component === "url"
					? component.toUpperCase()
					: component.charAt(0).toUpperCase() + component.slice(1),
			)
			.join("")
	);
}

function isMachineError(value: unknown): value is MachineErrorResponse {
	return isRecord(value) && value.ok === false && isRecord(value.error) && typeof value.error.message === "string";
}
