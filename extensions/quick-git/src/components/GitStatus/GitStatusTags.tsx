import { useMemo } from "react"
import { Color, List } from "@raycast/api"
import type { GitStatus } from "../../utils/status.js"

interface Props {
	stagedStatus: GitStatus
	unstagedStatus: GitStatus
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

export function GitStatusTags({ stagedStatus, unstagedStatus }: Props) {
	const tags = useMemo(() => {
		const tags = []
		let status
		const isNotStaged = stagedStatus === "." || stagedStatus === "?"
		if (isNotStaged) {
			status = tagForStatus(unstagedStatus)
			if (status) {
				tags.push(["Unstaged", Color.SecondaryText])
			}
		} else {
			status = tagForStatus(stagedStatus)
			if (status) {
				tags.push(["Staged", Color.PrimaryText])
			}
		}

		if (status) {
			tags.push(status)
		}

		return tags
	}, [stagedStatus, unstagedStatus])

	return (
		<List.Item.Detail.Metadata.TagList title="Status">
			{tags.map((tag, index) => (
				<List.Item.Detail.Metadata.TagList.Item
					key={index}
					text={tag[0]}
					color={tag[1]}
				/>
			))}
		</List.Item.Detail.Metadata.TagList>
	)
}
