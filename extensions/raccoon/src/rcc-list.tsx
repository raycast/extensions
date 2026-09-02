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
import { useExec } from "@raycast/utils";
import { JSON_TIMEOUT_MS, readJson } from "./json-out.ts";
import type { ReactNode } from "react";
import { findCommand } from "./commands";
import { MissingRcc, REPO_URL } from "./missing-rcc";
import { RccDetail } from "./rcc-detail";
import { RccNotFoundError, resolveRcc, RUNTIME_PATH } from "./rcc";

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

	const { isLoading, data, error, revalidate } = useExec(
		rccPath ?? "rcc",
		[command, "--json"],
		{
			execute: rccPath !== null,
			env: { ...process.env, NO_COLOR: "1", PATH: RUNTIME_PATH },
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

	if (error) {
		return (
			<List>
				<List.EmptyView
					icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
					title={`rcc ${command} could not be read`}
					description={error.message}
					actions={actions}
				/>
			</List>
		);
	}

	return (
		<List
			isLoading={isLoading}
			navigationTitle={navigationTitle(data)}
			searchBarPlaceholder={searchBarPlaceholder}
		>
			<List.EmptyView
				icon={{ source: emptyIcon, tintColor: Color.SecondaryText }}
				title={isLoading ? `Running rcc ${command}` : emptyTitle}
				actions={actions}
			/>
			{data ? children(data, sharedActions) : null}
		</List>
	);
}
