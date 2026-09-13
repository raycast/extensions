import { Action, Color, Icon, List } from "@raycast/api";
import { join } from "node:path";
import { homedir } from "node:os";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import { shellQuote } from "./terminal";
import {
	keyLevel,
	parseSsh,
	problemCount,
	reason,
	sortKeys,
	type KeyLevel,
	type SshKey,
	type SshReport,
} from "./ssh-json";

const TINT: Record<KeyLevel, Color> = {
	unprotected: Color.Red,
	"loose-perms": Color.Orange,
	orphan: Color.SecondaryText,
	ok: Color.Green,
};

const ICON: Record<KeyLevel, Icon> = {
	unprotected: Icon.LockUnlocked,
	"loose-perms": Icon.Warning,
	orphan: Icon.QuestionMark,
	ok: Icon.Lock,
};

const SECTION: Record<KeyLevel, string> = {
	unprotected: "No passphrase",
	"loose-perms": "Wrong permissions",
	orphan: "No public key",
	ok: "In good order",
};

const ORDER: KeyLevel[] = ["unprotected", "loose-perms", "orphan", "ok"];

const sshPath = (name: string) => join(homedir(), ".ssh", name);

/**
 * What resolves each problem, run in Terminal because two of the three need an
 * answer: ssh-keygen -p asks for the new passphrase twice, and there is nowhere
 * in a Raycast view to type it.
 */
function fixFor(key: SshKey): { title: string; command: string } | undefined {
	switch (keyLevel(key)) {
		case "unprotected":
			return {
				title: "Add a Passphrase",
				command: `ssh-keygen -p -f ${shellQuote(sshPath(key.name))}`,
			};
		case "loose-perms":
			return {
				title: "Set Mode to 600",
				command: `chmod 600 ${shellQuote(sshPath(key.name))} && ls -l ${shellQuote(sshPath(key.name))}`,
			};
		case "orphan":
			return {
				title: "Regenerate the Public Key",
				command: `ssh-keygen -y -f ${shellQuote(sshPath(key.name))} | tee ${shellQuote(`${sshPath(key.name)}.pub`)}`,
			};
		case "ok":
			return undefined;
	}
}

/** Every key on screen that has something to put right, as one command. */
function fixAll(keys: SshKey[]) {
	const fixable = keys
		.map((key) => ({ key, fix: fixFor(key) }))
		.filter(
			(
				f,
			): f is {
				key: SshKey;
				fix: NonNullable<ReturnType<typeof fixFor>>;
			} => Boolean(f.fix),
		);
	if (fixable.length === 0) return undefined;
	return {
		// Chained with `;` and not `&&`: ssh-keygen -p returns non-zero when the
		// reader declines a passphrase, and one declined key must not stop the
		// permissions fix on the next one.
		title: `Fix ${fixable.length} ${fixable.length === 1 ? "Key" : "Keys"}`,
		command: fixable.map((f) => f.fix.command).join("; "),
		detail: fixable
			.map((f) => `${f.key.name}: ${f.fix.title.toLowerCase()}`)
			.join("\n"),
		destructive: true,
		count: fixable.length,
	};
}

function keyActions(
	key: SshKey,
	all: ReturnType<typeof fixAll>,
	shared: React.ReactNode,
) {
	const fix = fixFor(key);
	return (
		<RowActions
			one={
				fix
					? {
							title: fix.title,
							command: fix.command,
							detail:
								keyLevel(key) === "unprotected"
									? "ssh-keygen asks for the new passphrase twice, in Terminal."
									: undefined,
							destructive: keyLevel(key) !== "orphan",
						}
					: undefined
			}
			all={all}
			shared={shared}
		>
			{key.public_key ? (
				<Action.CopyToClipboard
					title="Copy Public Key Path"
					content={`${sshPath(key.name)}.pub`}
				/>
			) : null}
			<Action.ShowInFinder path={sshPath(key.name)} />
		</RowActions>
	);
}

function Rows({ s, actions }: { s: SshReport; actions: React.ReactNode }) {
	if (!s.ssh_dir_present) {
		return (
			<List.Item
				icon={{ source: Icon.Folder, tintColor: Color.SecondaryText }}
				title="No ~/.ssh on this Mac"
				subtitle="Nothing to check until a key is created"
				actions={<RowActions shared={actions} />}
			/>
		);
	}

	const problems = problemCount(s);
	const dirOk = s.ssh_dir_perms === "700";
	const sorted = sortKeys(s.keys);
	const all = fixAll(sorted);

	return (
		<>
			<List.Section title="~/.ssh">
				<List.Item
					icon={{
						source:
							problems === 0 ? Icon.CheckCircle : Icon.Warning,
						tintColor: problems === 0 ? Color.Green : Color.Orange,
					}}
					title={
						problems === 0
							? `${s.keys.length} ${s.keys.length === 1 ? "key" : "keys"}, all in good order`
							: `${problems} of ${s.keys.length} ${s.keys.length === 1 ? "key needs" : "keys need"} attention`
					}
					accessories={[
						{
							// The directory's own mode matters as much as any key's:
							// 700 is what keeps another account out of all of them.
							tag: {
								value: `dir ${s.ssh_dir_perms}`,
								color: dirOk ? Color.Green : Color.Red,
							},
						},
					]}
					actions={<RowActions all={all} shared={actions} />}
				/>
			</List.Section>

			{ORDER.map((level) => {
				const group = sorted.filter((k) => keyLevel(k) === level);
				if (group.length === 0) return null;
				return (
					<List.Section
						key={level}
						title={SECTION[level]}
						subtitle={`${group.length}`}
					>
						{group.map((key) => (
							<List.Item
								key={key.name}
								icon={{
									source: ICON[level],
									tintColor: TINT[level],
								}}
								title={key.name}
								subtitle={reason(key)}
								accessories={[
									{
										tag: {
											value: key.type,
											color: TINT[level],
										},
									},
								]}
								actions={keyActions(key, all, actions)}
							/>
						))}
					</List.Section>
				);
			})}
		</>
	);
}

export default function Command() {
	return (
		<RccList
			command="ssh"
			parse={parseSsh}
			navigationTitle={(s) => {
				if (!s) return "SSH Keys";
				const problems = problemCount(s);
				return problems === 0
					? "SSH keys — all in good order"
					: `SSH keys — ${problems} need attention`;
			}}
			searchBarPlaceholder="Search keys"
			emptyIcon={Icon.Key}
			emptyTitle="No SSH keys found"
		>
			{(s, actions) => <Rows s={s} actions={actions} />}
		</RccList>
	);
}
