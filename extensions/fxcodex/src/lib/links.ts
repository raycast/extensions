import { FXCodexInvocationError, invoke } from "./client";
import { ExecutableSource, InvocationResult, OpenURLOutput } from "./models";

// The schemes the installed Codex registers today. The CLI makes the final check against the app's
// `CFBundleURLTypes`; this list only decides which clipboard text is worth pre-filling.
export const appLinkSchemes = ["codex"];

// Returns the trimmed text when it is a link to one of Codex's schemes, otherwise `undefined`.
export function appLinkCandidate(text: string | undefined): string | undefined {
	const trimmed = text?.trim();
	if (!trimmed) return undefined;
	try {
		const scheme = new URL(trimmed).protocol.slice(0, -1).toLowerCase();
		return appLinkSchemes.includes(scheme) ? trimmed : undefined;
	} catch {
		return undefined;
	}
}

// Delivers a link to one workspace's Codex instance through `fxcodex open-url`.
export async function openLink(
	workspaceName: string,
	url: string,
	source?: ExecutableSource,
): Promise<InvocationResult<OpenURLOutput>> {
	try {
		return await invoke<OpenURLOutput>(["open-url", workspaceName, url], source);
	} catch (error) {
		// Executables older than open-url reject the subcommand as unexpected arguments.
		if (error instanceof FXCodexInvocationError && /unexpected arguments?: 'open-url'/.test(error.message)) {
			throw new FXCodexInvocationError(
				"This fxCodex executable cannot open links. Install fxcodex 0.3.1 or later.",
				"unsupported_command",
			);
		}
		throw error;
	}
}
