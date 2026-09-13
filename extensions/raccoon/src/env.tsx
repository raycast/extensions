import { Action, Color, Icon, List } from "@raycast/api";
import { removeSymlink, reveal, whichAll } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import { parseEnv, problems, shortVersion, type EnvReport } from "./env-json";

function Rows({ e, actions }: { e: EnvReport; actions: React.ReactNode }) {
	const missing = e.path.filter((p) => !p.exists);
	const present = e.path.filter((p) => p.exists);
	// Only one of the three problems can be put right by a command. A dangling
	// symlink is a file to delete. A PATH entry that does not exist and a PATH
	// entry listed twice both live in a shell startup file that only the reader
	// knows the shape of, so those rows open the file rather than rewrite it.
	const allBroken =
		e.broken_symlinks.length > 0
			? {
					title: `Remove ${e.broken_symlinks.length} Broken Symlinks`,
					command: removeSymlink(
						e.broken_symlinks.map((b) => b.link),
					),
					detail: e.broken_symlinks.map((b) => b.name).join(", "),
					destructive: true,
					count: e.broken_symlinks.length,
				}
			: undefined;
	return (
		<>
			{/* A command on the PATH that still fails: the most surprising of the
			    three, so it goes first even when the list is empty elsewhere. */}
			{e.broken_symlinks.length > 0 ? (
				<List.Section
					title="Broken symlinks"
					subtitle={`${e.broken_symlinks.length}`}
				>
					{e.broken_symlinks.map((b) => (
						<List.Item
							key={b.link}
							icon={{
								source: Icon.XMarkCircle,
								tintColor: Color.Red,
							}}
							title={b.name}
							subtitle={`→ ${b.target}`}
							accessories={[
								{
									tag: {
										value: "target gone",
										color: Color.Red,
									},
								},
							]}
							actions={
								<RowActions
									one={{
										title: "Remove This Symlink",
										command: removeSymlink([b.link]),
										detail: `${b.link} points at ${b.target}, which is gone.`,
										destructive: true,
									}}
									all={allBroken}
									shared={actions}
								/>
							}
						/>
					))}
				</List.Section>
			) : null}

			{missing.length > 0 ? (
				<List.Section
					title="Missing from disk"
					subtitle={`${missing.length}`}
				>
					{missing.map((p) => (
						<List.Item
							key={p.path}
							icon={{
								source: Icon.Folder,
								tintColor: Color.Orange,
							}}
							title={p.path}
							accessories={[
								{
									tag: {
										value: "does not exist",
										color: Color.Orange,
									},
								},
							]}
							actions={
								<RowActions all={allBroken} shared={actions}>
									{/* The entry lives in a shell startup file,
									    or in /etc/paths.d — 6 of 14 here did —
									    and only the reader knows which, so this
									    copies it rather than editing. */}
									<Action.CopyToClipboard
										title="Copy Path Entry"
										content={p.path}
									/>
								</RowActions>
							}
						/>
					))}
				</List.Section>
			) : null}

			{e.duplicates.length > 0 ? (
				<List.Section
					title="Listed twice"
					subtitle={`${e.duplicates.length}`}
				>
					{e.duplicates.map((d, i) => (
						<List.Item
							key={`${d}-${i}`}
							icon={{
								source: Icon.Duplicate,
								tintColor: Color.Orange,
							}}
							title={d}
							actions={
								<RowActions
									one={{
										title: "Show Every Place It Resolves From",
										command: whichAll(d),
									}}
									all={allBroken}
									shared={actions}
								/>
							}
						/>
					))}
				</List.Section>
			) : null}

			<List.Section title="Tools">
				{e.tools.map((t) => (
					<List.Item
						key={t.name}
						icon={{
							source: t.found ? Icon.CheckCircle : Icon.Minus,
							tintColor: t.found
								? Color.Green
								: Color.SecondaryText,
						}}
						title={t.name}
						subtitle={
							t.version
								? shortVersion(t.version)
								: "not installed"
						}
						actions={
							<RowActions
								one={
									t.found
										? {
												title: "Show Every Place It Resolves From",
												command: whichAll(t.name),
											}
										: undefined
								}
								all={allBroken}
								shared={actions}
							/>
						}
					/>
				))}
			</List.Section>

			<List.Section title="PATH" subtitle={`${present.length} entries`}>
				{present.map((p, i) => (
					<List.Item
						key={`${p.path}-${i}`}
						icon={{
							source: Icon.Folder,
							tintColor: Color.SecondaryText,
						}}
						title={p.path}
						// Position matters: the first match on the PATH is the one that runs.
						accessories={[{ text: `#${i + 1}` }]}
						actions={
							<RowActions
								one={{
									title: "Show This Directory in Finder",
									command: reveal(p.path),
								}}
								all={allBroken}
								shared={actions}
							/>
						}
					/>
				))}
			</List.Section>
		</>
	);
}

export default function Command() {
	return (
		<RccList
			command="env"
			parse={parseEnv}
			navigationTitle={(e) => {
				if (!e) return "Environment";
				const n = problems(e);
				return n === 0
					? `Environment — ${e.path.length} PATH entries, nothing wrong`
					: `Environment — ${n} ${n === 1 ? "problem" : "problems"}`;
			}}
			searchBarPlaceholder="Search PATH entries, symlinks and tools"
			emptyIcon={Icon.Terminal}
			emptyTitle="Nothing on the PATH"
		>
			{(e, actions) => <Rows e={e} actions={actions} />}
		</RccList>
	);
}
