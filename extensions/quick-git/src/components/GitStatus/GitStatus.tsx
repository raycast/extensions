import { Action, ActionPanel, Icon, List } from "@raycast/api"
import type { GitStatus } from "../../utils/status.js"
import { parseGitStatus } from "../../utils/status.js"
import { GitStatusItem } from "./GitStatusItem.js"
import SelectRepo from "../SelectRepo.js"
import { useExec } from "@raycast/utils"
import { RemoteGitActions } from "./RemoteGitActions.js"
import { GitStatusEmpty } from "./GitStatusEmpty.js"
import { GitBranch } from "../GitBranch/GitBranch.js"

interface Props {
	repo?: string
	isLoadingRepo: boolean
}

export function GitStatus({ repo, isLoadingRepo }: Props) {
	const { data, isLoading, revalidate } = useExec(
		"git",
		["status", "--porcelain=2", "--branch"],
		{
			cwd: repo,
			execute: !!repo,
			keepPreviousData: false,
			failureToastOptions: { title: "Could not fetch git status" },
			parseOutput: ({ stdout }) => {
				if (!stdout) {
					return
				}
				return parseGitStatus(stdout)
			},
		},
	)

	return (
		<List
			searchBarPlaceholder="Search modified files…"
			navigationTitle="Git Status"
			isShowingDetail={!!repo && !!data?.files.length}
			isLoading={isLoadingRepo || isLoading}
			actions={
				<ActionPanel>
					{repo ? (
						<>
							<Action.Push
								icon={Icon.Tree}
								title="Switch Branch"
								target={<GitBranch repo={repo} checkStatus={revalidate} />}
							/>
							<RemoteGitActions repo={repo} checkStatus={revalidate} />
							<Action.Push
								icon={Icon.Folder}
								title="Change Current Repo"
								target={<SelectRepo />}
							/>
						</>
					) : (
						<Action.Push
							icon={Icon.Folder}
							title="Set Repo"
							target={<SelectRepo />}
						/>
					)}
				</ActionPanel>
			}
		>
			{repo && data?.files.length ? (
				data.files.map((item) => {
					return (
						<GitStatusItem
							key={item.fileName}
							repo={repo}
							status={item}
							branch={data.branch}
							checkStatus={revalidate}
						/>
					)
				})
			) : (
				<GitStatusEmpty repo={repo} branch={data?.branch} />
			)}
		</List>
	)
}
