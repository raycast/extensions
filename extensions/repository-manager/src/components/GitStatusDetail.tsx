import { Action, ActionPanel, Color, Detail, Icon, useNavigation } from '@raycast/api'
import { Project } from '../project'
import { useExec } from '@raycast/utils'
import { OpenInEditor, OpenInTerminal } from './Open'
import OpenGitRemotes from './OpenGitRemotes'
import GitPullDetail from './GitPullDetail'

type GitStatusDetailProps = {
    project: Project
}

type FileChange = {
    path: string
    indexStatus: string
    worktreeStatus: string
}

function parseStatus(status: string | undefined): FileChange[] {
    return (
        status
            ?.split('\n')
            .filter(Boolean)
            .map((line) => ({
                indexStatus: line[0] || ' ',
                worktreeStatus: line[1] || ' ',
                path: line.slice(3),
            })) ?? []
    )
}

function statusLabel(status: string): string {
    switch (status) {
        case 'A':
            return 'Added'
        case 'M':
            return 'Modified'
        case 'D':
            return 'Deleted'
        case 'R':
            return 'Renamed'
        case 'C':
            return 'Copied'
        case 'U':
            return 'Unmerged'
        case '?':
            return 'Untracked'
        default:
            return 'Changed'
    }
}

function renderFileList(title: string, files: FileChange[], statusSelector: (file: FileChange) => string): string {
    if (files.length === 0) {
        return ''
    }

    const fileRows = files.map((file) => `- \`${file.path}\` ${statusLabel(statusSelector(file))}`).join('\n')

    return `
## ${title}

${fileRows}
`
}

export default function GitStatusDetail({ project }: GitStatusDetailProps) {
    const { push, pop } = useNavigation()
    const cachedHealth = project.gitHealth
    const { isLoading, data: status } = useExec('git', ['status', '--porcelain'], { cwd: project.fullPath })
    const { data: currentBranchFromGit, isLoading: isLoadingBranch } = useExec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: project.fullPath,
        execute: !cachedHealth,
    })

    const {
        data: upstreamBranchFromGit,
        isLoading: isLoadingUpstream,
        error: upstreamError,
    } = useExec('git', ['rev-parse', '--abbrev-ref', 'HEAD@{upstream}'], {
        cwd: project.fullPath,
        execute: !cachedHealth,
    })

    const upstreamBranch = cachedHealth?.upstream || upstreamBranchFromGit
    const { data: remoteStatus, isLoading: isLoadingRemoteStatus } = useExec('git', ['rev-list', '--left-right', '--count', `HEAD...${upstreamBranch}`], {
        cwd: project.fullPath,
        execute: !cachedHealth && !isLoadingUpstream && !!upstreamBranch && !upstreamError,
    })

    const changes = parseStatus(status)
    const stagedFiles = changes.filter((file) => file.indexStatus !== ' ' && file.indexStatus !== '?')
    const unstagedFiles = changes.filter((file) => file.worktreeStatus !== ' ' && file.indexStatus !== '?')
    const untrackedFiles = changes.filter((file) => file.indexStatus === '?' && file.worktreeStatus === '?')
    const conflictedFiles = changes.filter((file) => file.indexStatus === 'U' || file.worktreeStatus === 'U')

    const [aheadFromGit = '0', behindFromGit = '0'] = remoteStatus?.trim().split(/\s+/) ?? []
    const ahead = cachedHealth ? cachedHealth.ahead.toString() : aheadFromGit
    const behind = cachedHealth ? cachedHealth.behind.toString() : behindFromGit
    const currentBranch = cachedHealth?.branch || currentBranchFromGit?.trim() || 'Unknown'
    const hasUpstream = cachedHealth ? cachedHealth.hasUpstream : !upstreamError && !!upstreamBranch
    const isClean = changes.length === 0

    const syncSummary = !cachedHealth && (isLoadingUpstream || isLoadingRemoteStatus) ? 'Checking upstream...' : hasUpstream ? `${ahead} ahead, ${behind} behind ${upstreamBranch}` : 'No upstream branch'

    const markdown = `
# ${project.name}

## Overview

| Area | Status |
| --- | --- |
| Branch | ${!cachedHealth && isLoadingBranch ? 'Checking...' : `\`${currentBranch}\``} |
| Upstream | ${hasUpstream ? `\`${upstreamBranch}\`` : 'Not configured'} |
| Sync | ${syncSummary} |
| Working Tree | ${isClean ? 'Clean' : 'Has local changes'} |

## Change Summary

| Type | Count |
| --- | ---: |
| Staged | ${stagedFiles.length} |
| Unstaged | ${unstagedFiles.length} |
| Untracked | ${untrackedFiles.length} |
| Conflicts | ${conflictedFiles.length} |

${isClean ? '## Local Changes\n\nNo local changes. The working tree is clean.\n' : ''}
${renderFileList('Staged Changes', stagedFiles, (file) => file.indexStatus)}
${renderFileList('Unstaged Changes', unstagedFiles, (file) => file.worktreeStatus)}
${renderFileList('Untracked Files', untrackedFiles, () => '?')}
${renderFileList('Conflicts', conflictedFiles, () => 'U')}

## Raw Status

\`\`\`bash
${status ? status : 'No changes'}
\`\`\`
`

    return (
        <Detail
            isLoading={isLoading || (!cachedHealth && (isLoadingBranch || isLoadingUpstream || isLoadingRemoteStatus))}
            markdown={markdown}
            metadata={
                <Detail.Metadata>
                    <Detail.Metadata.Label
                        title="Branch"
                        text={currentBranch}
                    />
                    <Detail.Metadata.TagList title="Working Tree">
                        <Detail.Metadata.TagList.Item
                            text={isClean ? 'Clean' : `${changes.length} changed`}
                            color={isClean ? Color.Green : Color.Orange}
                        />
                    </Detail.Metadata.TagList>
                    <Detail.Metadata.TagList title="Sync">
                        <Detail.Metadata.TagList.Item
                            text={hasUpstream ? `${ahead} ahead` : 'No upstream'}
                            color={Number(ahead) > 0 ? Color.Green : Color.SecondaryText}
                        />
                        {hasUpstream && (
                            <Detail.Metadata.TagList.Item
                                text={`${behind} behind`}
                                color={Number(behind) > 0 ? Color.Red : Color.SecondaryText}
                            />
                        )}
                    </Detail.Metadata.TagList>
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label
                        title="Staged"
                        text={stagedFiles.length.toString()}
                    />
                    <Detail.Metadata.Label
                        title="Unstaged"
                        text={unstagedFiles.length.toString()}
                    />
                    <Detail.Metadata.Label
                        title="Untracked"
                        text={untrackedFiles.length.toString()}
                    />
                </Detail.Metadata>
            }
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
