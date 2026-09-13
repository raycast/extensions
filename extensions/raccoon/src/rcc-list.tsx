import {
	Action,
	ActionPanel,
	Color,
	Icon,
	Keyboard,
	List,
	openExtensionPreferences,
	useNavigation,
} from "@raycast/api";
import { useExec, usePromise } from "@raycast/utils";
import { JSON_TIMEOUT_MS, readJson } from "./json-out.ts";
import type { ReactNode } from "react";
import { findCommand } from "./commands";
import { MissingRcc, REPO_URL } from "./missing-rcc";
import { RccDetail } from "./rcc-detail";
import { pathFor, RccNotFoundError, resolveRcc, RUNTIME_PATH } from "./rcc";

/**
 * The scaffolding every list view repeats: resolve rcc, run it with --json,
 * turn a parse failure into a screen that says what happened, and keep the
 * raw output one keystroke away.
 *
 * Written once because the fifth copy of it was where the differences started
 * being accidental rather than meant.
 */
export function RccList<T>({
	command,
	parse,
	navigationTitle,
	searchBarPlaceholder,
	emptyIcon,
	emptyTitle,
	children,
}: {
	command: string;
	parse: (stdout: string) => T;
	navigationTitle: (data: T | undefined) => string;
	searchBarPlaceholder: string;
	emptyIcon: Icon;
	emptyTitle: string;
	children: (data: T, actions: ReactNode) => ReactNode;
}) {
	const { push } = useNavigation();

	let rccPath: string | null = null;
	let resolveError: unknown;
	try {
		rccPath = resolveRcc();
	} catch (error) {
		resolveError = error;
	}

	// `env` and `overlap` are about the reader's own PATH, so they run under
	// it; everything else runs under the one rcc's tools need. See pathFor.
	const path = usePromise(pathFor, [command]);

	const { isLoading, data, error, revalidate } = useExec(
		rccPath ?? "rcc",
		[command, "--json"],
		{
			execute: rccPath !== null && path.data !== undefined,
			env: {
				...process.env,
				NO_COLOR: "1",
				PATH: path.data ?? RUNTIME_PATH,
			},
			timeout: JSON_TIMEOUT_MS,
			parseOutput: readJson(command, parse),
		},
	);

	// A fragment of Actions, not an ActionPanel: a row composes these into its
	// own panel alongside whatever it can resolve. Handing out a whole
	// ActionPanel meant every view that added a row action nested one panel
	// inside another, which Raycast does not render.
	const sharedActions = (
		<>
			<Action
				title="Run Again"
				icon={Icon.ArrowClockwise}
				shortcut={Keyboard.Shortcut.Common.Refresh}
				onAction={revalidate}
			/>
			{/* The table exists for whoever wants it, and is not the default. */}
			<Action
				title="Show Raw Output"
				icon={Icon.Text}
				shortcut={{ modifiers: ["cmd"], key: "t" }}
				onAction={() =>
					push(<RccDetail command={findCommand(command)} />)
				}
			/>
			<Action
				title="Set Rcc Path"
				icon={Icon.Gear}
				onAction={openExtensionPreferences}
			/>
			<Action.OpenInBrowser
				title="Open Raccoon on GitHub"
				url={REPO_URL}
			/>
		</>
	);

	const actions = <ActionPanel>{sharedActions}</ActionPanel>;

	if (resolveError instanceof RccNotFoundError) return <MissingRcc />;

	// A PATH that could not be read is not a PATH with nothing on it: the
	// screen says so instead of auditing the wrong one.
	const failure = path.error ?? error;
	if (failure) {
		return (
			<List>
				<List.EmptyView
					icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
					title={
						path.error
							? "Your shell's PATH could not be read"
							: `rcc ${command} could not be read`
					}
					description={failure.message}
					actions={actions}
				/>
			</List>
		);
	}

	return (
		<List
			isLoading={isLoading || path.isLoading}
			navigationTitle={navigationTitle(data)}
			searchBarPlaceholder={searchBarPlaceholder}
		>
			<List.EmptyView
				icon={{ source: emptyIcon, tintColor: Color.SecondaryText }}
				title={
					isLoading || path.isLoading
						? `Running rcc ${command}`
						: emptyTitle
				}
				actions={actions}
			/>
			{data ? children(data, sharedActions) : null}
		</List>
	);
}
