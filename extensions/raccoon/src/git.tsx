import { Action, Color, Icon, Keyboard, List } from "@raycast/api";
import { homedir } from "node:os";
import { RccList } from "./rcc-list";
import { gitPush, gitPushAll, repoStatus } from "./fixes";
import { RowActions } from "./resolve";
import {
	parseGit,
	repoLevel,
	shortPath,
	sortRepos,
	summarise,
	type GitReport,
	type GitRepo,
	type RepoLevel,
} from "./git-json";

const TINT: Record<RepoLevel, Color> = {
	unpushed: Color.Red,
	detached: Color.Red,
	uncommitted: Color.Orange,
	loose: Color.SecondaryText,
};

const ICON: Record<RepoLevel, Icon> = {
	unpushed: Icon.ArrowUpCircle,
	detached: Icon.Warning,
	uncommitted: Icon.Pencil,
	loose: Icon.Link,
};

const SECTION: Record<RepoLevel, string> = {
	unpushed: "Only on this Mac",
	detached: "Not on a branch",
	uncommitted: "Uncommitted work",
	loose: "No upstream, or stashed",
};

const ORDER: RepoLevel[] = ["unpushed", "detached", "uncommitted", "loose"];

/**
 * What Enter does to a repository depends on what is wrong with it.
 *
 * Commits that exist only on this disk have one resolution and it is a command:
 * push them. Uncommitted work does not — what to commit and what to say about
 * it are decisions, and no keystroke should guess them — so those rows open the
 * repository with its status printed and leave the decision where it belongs.
 */
function repoFix(repo: GitRepo) {
	if (repo.unpushed > 0 && repo.uncommitted === 0) {
		return {
			title: `Push ${repo.unpushed} ${repo.unpushed === 1 ? "Commit" : "Commits"}`,
			command: gitPush(repo.path),
			detail: `${repo.name} — the working tree is clean, so pushing is the whole of it.`,
		};
	}
	return {
		title: "Open in Terminal",
		command: repoStatus(repo.path),
		detail:
			repo.uncommitted > 0
				? `${repo.uncommitted} uncommitted ${repo.uncommitted === 1 ? "change" : "changes"}: what to commit is yours to choose.`
				: undefined,
	};
}

function Rows({ g, actions }: { g: GitReport; actions: React.ReactNode }) {
	const home = homedir();
	const sorted = sortRepos(g.repos);
	const clean = g.repos_total - g.repos_with_issues;
	// The bulk form only takes the repositories where pushing is the whole
	// answer. A repository with uncommitted work is left out on purpose: the
	// keystroke has to mean the same thing for every row it touches.
	const pushable = sorted.filter(
		(r) => r.unpushed > 0 && r.uncommitted === 0,
	);
	const pushAll =
		pushable.length > 0
			? {
					title: `Push ${pushable.length} Clean ${pushable.length === 1 ? "Repository" : "Repositories"}`,
					command: gitPushAll(pushable.map((r) => r.path)),
					detail: pushable
						.map((r) => `${r.name} (${r.unpushed})`)
						.join(", "),
					count: pushable.length,
				}
			: undefined;

	return (
		<>
			<List.Section title="Scanned">
				<List.Item
					icon={{
						source:
							g.repos_with_issues === 0
								? Icon.CheckCircle
								: Icon.Folder,
						tintColor:
							g.repos_with_issues === 0
								? Color.Green
								: Color.SecondaryText,
					}}
					title={
						g.repos_with_issues === 0
							? "Every repository is clean"
							: `${g.repos_with_issues} of ${g.repos_total} need attention`
					}
					subtitle={`${clean} clean`}
					actions={<RowActions all={pushAll} shared={actions} />}
				/>
			</List.Section>

			{ORDER.map((level) => {
				const group = sorted.filter((r) => repoLevel(r) === level);
				if (group.length === 0) return null;
				return (
					<List.Section
						key={level}
						title={SECTION[level]}
						subtitle={`${group.length}`}
					>
						{group.map((repo) => (
							<List.Item
								key={repo.path}
								icon={{
									source: ICON[level],
									tintColor: TINT[level],
								}}
								title={repo.name}
								subtitle={shortPath(repo.path, home)}
								accessories={[
									{
										tag: {
											value: summarise(repo),
											color: TINT[level],
										},
									},
								]}
								actions={
									<RowActions
										one={repoFix(repo)}
										all={pushAll}
										shared={actions}
									>
										<Action.ShowInFinder path={repo.path} />
										<Action.CopyToClipboard
											title="Copy Path"
											content={repo.path}
											shortcut={
												Keyboard.Shortcut.Common.Pin
											}
										/>
									</RowActions>
								}
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
			command="git"
			parse={parseGit}
			navigationTitle={(g) =>
				g
					? g.repos_with_issues === 0
						? "Git — all clean"
						: `Git — ${g.repos_with_issues} of ${g.repos_total} need attention`
					: "Git"
			}
			searchBarPlaceholder="Search repositories"
			emptyIcon={Icon.Folder}
			emptyTitle="No git repositories found"
		>
			{(g, actions) => <Rows g={g} actions={actions} />}
		</RccList>
	);
}
