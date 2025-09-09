import { Action, ActionPanel, Detail, Icon, useNavigation } from '@raycast/api'
import { Project } from '../project'
import { useExec } from '@raycast/utils'
import { OpenInEditor, OpenInTerminal } from './Open'
import OpenGitRemotes from './OpenGitRemotes'
import GitPullDetail from './GitPullDetail'

type GitStatusDetailProps = {
    project: Project
}

export default function GitStatusDetail({ project }: GitStatusDetailProps) {
    const { push, pop } = useNavigation()
    const { isLoading, data: status } = useExec('git', ['status', '--porcelain'], { cwd: project.fullPath })

    const {
        data: upstreamBranch,
        isLoading: isLoadingUpstream,
        error: upstreamError,
    } = useExec('git', ['rev-parse', '--abbrev-ref', 'HEAD@{upstream}'], {
        cwd: project.fullPath,
    })

    const { data: remoteStatus, isLoading: isLoadingRemoteStatus } = useExec('git', ['rev-list', '--left-right', '--count', `HEAD...${upstreamBranch}`], {
        cwd: project.fullPath,
        execute: !isLoadingUpstream && !!upstreamBranch && !upstreamError,
    })

    const modifiedFilesStaged = (status?.match(/M/g) || []).length
    const modifiedFilesUnstaged = (status?.match(/ M/g) || []).length
    const deletedFiles = (status?.match(/ D/g) || []).length
    const untrackedFiles = (status?.match(/\?\?/g) || []).length
    const stagedFiles = (status?.match(/^A\s.*$/gm) || []).length + (status?.match(/^M\s.*$/gm) || []).length
    const stagedAndReModified = (status?.match(/AM/g) || []).length

    const [ahead, behind] = remoteStatus?.split('	') ?? []

    const getAheadBehind = () => {
        if (isLoadingUpstream || isLoadingRemoteStatus) {
            return `
- **Ahead by**: ...
- **Behind by**: ...
`
        }
        if (upstreamError || !upstreamBranch) {
            return `
- **Ahead by**: N/A (no upstream branch)
- **Behind by**: N/A (no upstream branch)
`
        }
        return `
- **Ahead by**: ${ahead} commits
- **Behind by**: ${behind} commits
`
    }

    const markdown = `
# ${project.name}

## Git Status
${isLoading ? 'Checking status...' : ''}

- **Modified and staged files**: ${modifiedFilesStaged}
- **Modified and unstaged files**: ${modifiedFilesUnstaged}
- **Deleted files**: ${deletedFiles}
- **Untracked files**: ${untrackedFiles}
- **Staged files**: ${stagedFiles}
- **Staged and re-modified files**: ${stagedAndReModified}
${getAheadBehind()}

\`\`\`bash
${status ? status : 'No changes'}
\`\`\`
`

    return (
        <Detail
            isLoading={isLoading || isLoadingUpstream || isLoadingRemoteStatus}
            markdown={markdown}
            actions={
                <ActionPanel>
                    <Action
                        title="Close"
                        icon={Icon.XMarkCircle}
                        onAction={() => pop()}
                    />
                    <OpenInEditor project={project} />
                    <OpenInTerminal project={project} />
                    <OpenGitRemotes project={project} />
                    <Action
                        title="Git Pull"
                        icon={Icon.Download}
                        shortcut={{ modifiers: ['cmd'], key: 'g' }}
                        onAction={() => push(<GitPullDetail project={project} />)}
                    />
                </ActionPanel>
            }
        />
    )
}
