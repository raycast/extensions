import { Icon, List } from "@raycast/api"
import { useMemo } from "react"
import { GitStatusItemActions } from "./GitStatusItemActions.js"
import type { StatusInfo } from "../../utils/status.js"
import { BranchInfo } from "../../utils/branch.js"
import { GitStatusItemDetail } from "./GitStatusItemDetail.js"

interface Props {
	repo: string
	branch: BranchInfo
	status: StatusInfo
	checkStatus: () => void
}

export function GitStatusItem({ repo, status, branch, checkStatus }: Props) {
	const isNotStaged = useMemo(() => {
		return status.staged === "." || status.staged === "?"
	}, [status.staged])

	const title = useMemo(() => {
		if (status.origPath) {
			return `${status.origPath} -> ${status.fileName}`
		}
		return status.fileName
	}, [status.fileName, status.origPath])

	return (
		<List.Item
			icon={isNotStaged ? Icon.Circle : Icon.CheckCircle}
			title={title}
			actions={
				<GitStatusItemActions
					isNotStaged={isNotStaged}
					repo={repo}
					fileName={status.fileName}
					checkStatus={checkStatus}
				/>
			}
			detail={<GitStatusItemDetail branch={branch} status={status} />}
		/>
	)
}
