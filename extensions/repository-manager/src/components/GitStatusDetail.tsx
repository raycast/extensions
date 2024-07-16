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
    const { data: remoteStatus } = useExec('git', ['rev-list', '--left-right', '--count', 'HEAD...origin/main'], { cwd: project.fullPath })

    const modifiedFilesStaged = (status?.match(/M/g) || []).length
    const modifiedFilesUnstaged = (status?.match(/ M/g) || []).length
    const deletedFiles = (status?.match(/ D/g) || []).length
    const untrackedFiles = (status?.match(/\?\?/g) || []).length
    const stagedFiles = (status?.match(/^A\s.*$/gm) || []).length + (status?.match(/^M\s.*$/gm) || []).length
    const stagedAndReModified = (status?.match(/AM/g) || []).length

    const [ahead, behind] = remoteStatus?.split('\t') ?? []

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
- **Ahead by**: ${ahead} commits
- **Behind by**: ${behind} commits

\`\`\`bash
${status ? status : 'No changes'}
\`\`\`
`

    return (
        <Detail
            isLoading={isLoading}
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
