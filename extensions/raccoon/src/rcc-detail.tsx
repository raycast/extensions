import {
	Action,
	ActionPanel,
	Alert,
	confirmAlert,
	Detail,
	Icon,
	Keyboard,
	openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import { MissingRcc, REPO_URL } from "./missing-rcc";
import type { RccCommand } from "./commands";
import {
	pendingFixCount,
	progressBar,
	progressOf,
	toMarkdown,
	withoutProgress,
	withSudoHint,
} from "./markdown";
import { isFailure } from "./exit";
import { RccNotFoundError } from "./rcc";
import { useRccStream } from "./use-rcc-stream";

/** What to say about a run that ended badly, with whatever stderr explained. */
function failureNotice(
	args: string[],
	code: number,
	stderrOutput: string,
): string[] {
	const reason = stderrOutput.trim();
	return [
		`> **\`rcc ${args.join(" ")}\` exited with status ${code}.**`,
		"> The output above may be incomplete.",
		...(reason ? ["", "```", reason, "```"] : []),
	];
}

export function RccDetail({ command }: { command: RccCommand }) {
	const [args, setArgs] = useState(command.args);
	const {
		output,
		stdoutOutput,
		stderrOutput,
		exit,
		isLoading,
		error,
		reload,
		stop,
	} = useRccStream(args);

	if (error instanceof RccNotFoundError) return <MissingRcc />;

	// Three states, not two: a command that ends without printing anything used
	// to leave "Running" on the screen for good.
	let markdown: string;
	if (error) {
		markdown = [
			`## ${command.title} failed`,
			"",
			"```",
			error.message,
			"```",
		].join("\n");
	} else if (output) {
		// `upgrade` and `apps` report their step count as they go. Showing it as
		// a bar is the whole point of that protocol — printing the raw markers,
		// which is what happened until now, shows the reader the wiring instead.
		const progress = isLoading ? progressOf(output) : undefined;
		markdown = [
			...(progress ? [progressBar(progress), "", "---", ""] : []),
			withSudoHint(toMarkdown(output)),
		].join("\n");
	} else if (isLoading) {
		markdown = `Running \`rcc ${args.join(" ")}\``;
	} else {
		markdown = `\`rcc ${args.join(" ")}\` finished without printing anything.`;
	}

	// rcc audit says what it found through its exit status, so a non-zero code is
	// not news by itself. Anything isFailure() does call a failure is reported
	// here, because the output alone can look like an ordinary short report.
	if (exit && isFailure(args, exit, stdoutOutput.trim() !== "")) {
		markdown += [
			"",
			"",
			"---",
			"",
			...failureNotice(args, exit.code, stderrOutput),
		].join("\n");
	}

	// rcc offers its fixes through a terminal prompt that Raycast cannot answer,
	// so the offer is re-made here as an explicit, confirmed action.
	const fixes = command.args[0] === "audit" ? pendingFixCount(output) : 0;
	const applyFixes = async () => {
		const confirmed = await confirmAlert({
			title: `Apply ${fixes} automatic ${fixes === 1 ? "fix" : "fixes"}?`,
			message:
				"Raccoon will change system security settings. Review the report first.",
			primaryAction: {
				title: "Apply Fixes",
				style: Alert.ActionStyle.Destructive,
			},
		});
		if (!confirmed) return;
		setArgs(["audit", "--fix", "--force"]);
	};

	return (
		<Detail
			isLoading={isLoading}
			navigationTitle={command.title}
			markdown={markdown}
			actions={
				<ActionPanel>
					{isLoading ? (
						<Action title="Stop" icon={Icon.Stop} onAction={stop} />
					) : (
						<Action
							title="Run Again"
							icon={Icon.ArrowClockwise}
							shortcut={Keyboard.Shortcut.Common.Refresh}
							onAction={reload}
						/>
					)}
					{fixes > 0 && !isLoading && (
						<Action
							title={`Fix ${fixes} Issues Automatically`}
							icon={Icon.Hammer}
							onAction={applyFixes}
						/>
					)}
					<Action.CopyToClipboard
						title="Copy Output"
						content={withoutProgress(output)}
						shortcut={{ modifiers: ["cmd"], key: "c" }}
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
				</ActionPanel>
			}
		/>
	);
}
