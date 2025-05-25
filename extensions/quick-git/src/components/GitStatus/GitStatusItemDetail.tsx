import { Color, List } from "@raycast/api"
import type { BranchInfo } from "../../utils/branch.js"
import type { GitStatus, StatusInfo } from "../../utils/status.js"
import { useMemo } from "react"

interface Props {
	branch: BranchInfo
	status: StatusInfo
}

function tagForStatus(stagedStatus: GitStatus) {
	if (stagedStatus === ".") {
		return null
	}

	switch (stagedStatus) {
		case "A":
			return ["Added", Color.Green]
		case "M":
			return ["Modified", Color.Blue]
		case "T":
			return ["File type changed", Color.Blue]
		case "D":
			return ["Deleted", Color.Red]
		case "R":
			return ["Renamed", Color.Magenta]
		case "C":
			return ["Copied", Color.Magenta]
		case "U":
			return ["Unmerged", Color.Orange]
		case "?":
			return ["Untracked", Color.Green]
		case "!":
			return ["Ignored", Color.SecondaryText]
		default:
			return null
	}
}

export function GitStatusItemDetail({ branch, status }: Props) {
	const stagedTag = useMemo(() => {
		const tag = tagForStatus(status.staged)
		if (!tag) {
			return null
		}

		return (
			<>
				<List.Item.Detail.Metadata.TagList.Item
					text="Staged"
					color={Color.PrimaryText}
				/>
				<List.Item.Detail.Metadata.TagList.Item text={tag[0]} color={tag[1]} />
			</>
		)
	}, [status.staged])

	const unStagedTag = useMemo(() => {
		const tag = tagForStatus(status.unstaged)
		if (!tag) {
			return null
		}

		return (
			<>
				<List.Item.Detail.Metadata.TagList.Item
					text="Unstaged"
					color={Color.SecondaryText}
				/>
				<List.Item.Detail.Metadata.TagList.Item text={tag[0]} color={tag[1]} />
			</>
		)
	}, [status.unstaged])

	return (
		<List.Item.Detail
			metadata={
				<List.Item.Detail.Metadata>
					<List.Item.Detail.Metadata.Label
						title="File path"
						text={status.fileName}
					/>
					{status.origPath ? (
						<List.Item.Detail.Metadata.Label
							title="Original path"
							text={status.origPath}
						/>
					) : null}
					<List.Item.Detail.Metadata.TagList title="Status">
						{unStagedTag}
						{stagedTag}
					</List.Item.Detail.Metadata.TagList>
					<List.Item.Detail.Metadata.Separator />
					<List.Item.Detail.Metadata.Label title="Branch" text={branch.name} />
					{branch.upstream ? (
						<List.Item.Detail.Metadata.Label
							title="Upstream"
							text={branch.upstream}
						/>
					) : null}
					{branch.ahead ? (
						<List.Item.Detail.Metadata.Label
							title="Ahead"
							text={`${branch.ahead} commits`}
						/>
					) : null}
					{branch.behind ? (
						<List.Item.Detail.Metadata.Label
							title="Upstream"
							text={`${branch.behind} commits`}
						/>
					) : null}
				</List.Item.Detail.Metadata>
			}
		/>
	)
}
