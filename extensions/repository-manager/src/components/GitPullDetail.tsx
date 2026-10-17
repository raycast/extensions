import { Action, ActionPanel, Color, Detail, Icon, confirmAlert, useNavigation } from '@raycast/api'
import { useExec } from '@raycast/utils'
import { exec } from 'child_process'
import { promisify } from 'util'
import { useState } from 'react'
import { Project } from '../project'
import { OpenInEditor, OpenInTerminal } from './Open'
import OpenGitRemotes from './OpenGitRemotes'
import { showErrorToast, showSuccessToast } from '../ui/toast'

type GitPullDetailProps = {
    project: Project
}

const execAsync = promisify(exec)

export default function GitPullDetail({ project }: GitPullDetailProps) {
    const { pop } = useNavigation()
    const [isPulling, setIsPulling] = useState(false)
    const [pullOutput, setPullOutput] = useState<string | null>(null)
    const [pullError, setPullError] = useState<string | null>(null)

    const { isLoading: isLoadingStatus, data: status } = useExec('git', ['status', '--porcelain'], { cwd: project.fullPath })

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

    const statusLines = status?.split('\n').filter(Boolean) ?? []
    const isDirty = statusLines.length > 0
    const [ahead = '0', behind = '0'] = remoteStatus?.trim().split(/\s+/) ?? []
    const canPull = !isPulling && !isLoadingStatus && !isLoadingUpstream && !isLoadingRemoteStatus && !upstreamError && !!upstreamBranch

    async function pullLatestChanges() {
        if (!canPull) {
            await showErrorToast(upstreamError || !upstreamBranch ? 'No upstream branch configured' : 'Repository state is still loading')
            return
        }

        const confirmed = await confirmAlert({
            title: 'Pull Latest Changes?',
            message: isDirty ? 'This repository has local changes. Pulling may require conflict resolution.' : `Pull from ${upstreamBranch}?`,
            icon: { source: Icon.Download, tintColor: isDirty ? Color.Orange : Color.Blue },
        })

        if (!confirmed) {
            return
        }

        setIsPulling(true)
        setPullError(null)
        setPullOutput(null)

        try {
            const { stdout, stderr } = await execAsync('git pull', { cwd: project.fullPath })
            setPullOutput([stdout, stderr].filter(Boolean).join('\n') || 'Already up to date.')
            await showSuccessToast('Git pull completed')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Git pull failed'
            setPullError(message)
            await showErrorToast('Git pull failed', message)
        } finally {
            setIsPulling(false)
        }
    }

    const markdown = `
# ${project.name}

## Git Pull Preview
${isLoadingStatus || isLoadingUpstream || isLoadingRemoteStatus ? 'Checking repository state...' : ''}

- **Upstream**: ${upstreamError || !upstreamBranch ? 'N/A (no upstream branch)' : upstreamBranch}
- **Ahead by**: ${upstreamError || !upstreamBranch ? 'N/A' : `${ahead} commits`}
- **Behind by**: ${upstreamError || !upstreamBranch ? 'N/A' : `${behind} commits`}
- **Working tree**: ${isDirty ? `${statusLines.length} local changes` : 'Clean'}

${isDirty ? '## Local Changes\n\n```bash\n' + statusLines.join('\n') + '\n```' : ''}

${pullOutput ? '## Pull Output\n\n```bash\n' + pullOutput + '\n```' : ''}

${pullError ? '## Pull Error\n\n```bash\n' + pullError + '\n```' : ''}
`

    return (
        <Detail
            isLoading={isLoadingStatus || isLoadingUpstream || isLoadingRemoteStatus || isPulling}
            markdown={markdown}
            actions={
                <ActionPanel>
                    <Action
                        title="Pull Latest Changes"
                        icon={Icon.Download}
                        onAction={pullLatestChanges}
                        shortcut={{ modifiers: ['cmd'], key: 'p' }}
                    />
                    {!canPull && (
                        <Action
                            title={upstreamError || !upstreamBranch ? 'Cannot Pull Without Upstream' : 'Checking Repository State'}
                            icon={Icon.ExclamationMark}
                            onAction={() => showErrorToast(upstreamError || !upstreamBranch ? 'No upstream branch configured' : 'Repository state is still loading')}
                        />
                    )}
                    <Action
                        title="Close"
                        icon={Icon.XMarkCircle}
                        onAction={() => pop()}
                    />
                    <OpenInEditor project={project} />
                    <OpenInTerminal project={project} />
                    <OpenGitRemotes project={project} />
                </ActionPanel>
            }
        />
    )
}
