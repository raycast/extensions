import {
	Toast,
	environment,
	open,
	closeMainWindow,
	Clipboard,
	showHUD,
	showToast,
	getApplications,
} from "@raycast/api";
import * as TE from "@/lib/fp/task-either";
import { P, match } from "ts-pattern";

import { Preferences } from "./preferences";
import { SFSymbols, ScriptError } from "../models/types";
import { pipe } from "fp-ts/lib/function";

export const hasSFSymbolsInstalled = async () =>
	(await getApplications()).some((app) => app.bundleId == "com.apple.SFSymbols");

export const get_symbol = <K extends keyof typeof SFSymbols = keyof typeof SFSymbols>(key: K) => SFSymbols?.[key] ?? "";

/**
 * Creates a deeplink to a Raycast command
 * Code snippet took by the spotify-beta extension
 */
export function createDeeplink(commandName: string, payload?: Record<string, string | number | boolean>) {
	const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
	let deeplink = `${protocol}extensions/fedevitaledev/music/${commandName}`;

	if (payload) {
		const context = encodeURIComponent(JSON.stringify(payload));
		deeplink = `${deeplink}?launchContext=${context}`;
	}

	return deeplink;
}
/**
 *
 * Split number into N pieces, starting from 0
 *
 * @example divideNumber(100, 25) // => 0,25,50,75,100
 */
export const divideNumber = (num: number, step: number): number[] => {
	const arr: number[] = [];

	for (let i = 0; i <= num; i += step) {
		arr.push(i);
	}

	return arr;
};

export function displayError(error: Error | ScriptError) {
	const message = ScriptError.is(error) ? error.shortMessage : error.message;

	if (environment.commandMode === "menu-bar") {
		showHUD(`Error: ${message}`);
		return;
	}

	showToast({
		title: "Error",
		message,
		style: Toast.Style.Failure,
		primaryAction: {
			title: "Copy stack trace",
			onAction: () => Clipboard.copy(error.stack ?? error.message),
			shortcut: {
				key: "enter",
				modifiers: ["shift"],
			},
		},
		secondaryAction: {
			title: "Report Issue",
			onAction: async () => {
				await open(
					"https://github.com/raycast/extensions/issues/new?template=extension_bug_report.yml&extension-url=https%3A%2F%2Fraycast.com%2Ffedevitaledev%2Fmusic&title=%5BMusic%5D+..."
				);

				await showHUD(`Thanks for reporting this bug!`);
			},
			shortcut: {
				key: "enter",
				modifiers: ["cmd"],
			},
		},
	});
}

export const minMax = (min: number, max: number) => (value: number) => Math.max(Math.min(value, max), min);

interface Options<T, E> {
	successText?: string | ((val: T) => string);
	errorMessage?: string | ((val: E) => string);
	loading?: string;
	closeView?: boolean;
	onComplete?: () => void;
}

export const isMenuBar = () => environment.commandMode == "menu-bar";

export const promisify = async <E, T>(te: TE.TaskEither<E, T>): Promise<T> => {
	const r = await te();

	if (r._tag === "Left") {
		throw r.left;
	}

	return r.right;
};

function handleResult<T, E>(result: TE.TaskEither<E, T>, options: Options<T, E>): () => Promise<void>;
function handleResult<T, E>(result: TE.TaskEither<E, T>): () => Promise<void>;
function handleResult<T, E extends Error>(result: TE.TaskEither<E, T>, options?: Options<T, E>) {
	return async () => {
		const toast = await showToast(Toast.Style.Animated, options?.loading ?? "Loading...");

		const r = await result();

		const closeView = isMenuBar() ? false : options?.closeView ?? Preferences.closeMainWindowOnControls;

		match(r)
			.with({ _tag: "Right" }, ({ right: data }) => {
				if (!options?.successText) {
					toast.hide();
					return;
				}

				const message =
					typeof options.successText === "string" ? options.successText : options.successText(data);

				if (closeView) {
					showHUD(message);
					return;
				}

				toast.style = Toast.Style.Success;
				toast.title = message;
			})
			.with({ _tag: "Left" }, ({ left: error }) => {
				if (options?.errorMessage) {
					const message =
						typeof options.errorMessage === "string" ? options.errorMessage : options.errorMessage(error);
					showHUD(message);
				}

				displayError(error);
			})
			.exhaustive();

		options?.onComplete?.();
		toast.hide();

		if (!closeView || r._tag === "Left") return;
		closeMainWindow();
	};
}

type VoidFn<T> = (val: T) => void;

/**
 *
 * @param error - Function or error message
 * @param success - Function or success message
 */
export function handleTaskEitherError<E extends Error, T>(error?: string | VoidFn<E>, success?: string | VoidFn<T>) {
	const onSuccess = typeof success === "string" ? () => showHUD(success) : success;
	const onError = typeof error === "string" ? () => undefined : error;

	return (te: TE.TaskEither<E, T>) =>
		pipe(te, TE.tap(onSuccess), TE.tapLeft(onError), TE.tapLeft(console.error), TE.mapLeft(displayError));
}

export { handleResult };
