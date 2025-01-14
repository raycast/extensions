import { Action, ActionPanel, Detail, Icon, useNavigation } from '@raycast/api'
import { Project } from '../project'
import { useExec } from '@raycast/utils'
import { OpenInEditor, OpenInTerminal } from './Open'
import OpenGitRemotes from './OpenGitRemotes'
import GitStatusDetail from './GitStatusDetail'

type GitStatisticsDetailProps = {
    project: Project
}

export default function GitStatisticsDetail({ project }: GitStatisticsDetailProps) {
    const { push, pop } = useNavigation()
    const { isLoading: isLoadingCommits, data: totalCommits } = useExec('git', ['rev-list', '--all', '--count'], { cwd: project.fullPath })
    const { isLoading: isLoadingBranches, data: totalBranches } = useExec('git', ['branch', '-r'], { cwd: project.fullPath, parseOutput: (output) => output.stdout.split('\n').length - 1 })
    const { isLoading: isLoadingTags, data: totalTags } = useExec('git', ['tag'], { cwd: project.fullPath, parseOutput: (output) => output.stdout.split('\n').length - 1 })

    const isLoading = isLoadingCommits || isLoadingBranches || isLoadingTags

    const markdown = `
# ${project.name}

## Git Statistics
${isLoading ? 'Checking statistics...' : ''}
- Total Commits: ${totalCommits}
- Total Branches: ${totalBranches}
- Total Tags: ${totalTags}
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
                        title="Git Status"
                        icon={Icon.Download}
                        shortcut={{ modifiers: ['cmd'], key: 'g' }}
                        onAction={() => push(<GitStatusDetail project={project} />)}
                    />
                </ActionPanel>
            }
        />
    )
}
