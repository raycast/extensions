import { Action, ActionPanel, Color, Detail, Icon } from '@raycast/api'
import { Project } from '../project'
import { useExec } from '@raycast/utils'
import { OpenUrl } from './Open'
import OpenGitRemotes from './OpenGitRemotes'
import { Copy } from './Copy'
import Git from './Git'
import React, { useState } from 'react'
import Config from './Config'

type ProjectDetailProps = {
    project: Project
}

type Commit = {
    hash: string
    authorName: string
    authorEmail: string
    date: string
    message: string
}

function getDefaultMarkdown(project: Project, currentCommit: Commit | undefined): string {
    return `
# ${project.name}

${project.description || ''}

## Current Commit
- **Hash**: ${currentCommit?.hash}
- **Author**: ${currentCommit?.authorName} (<${currentCommit?.authorEmail}>)
- **Date**: ${currentCommit?.date}
- **Message**: 
\`\`\`
${currentCommit?.message}
\`\`\`
`
}

function getConfigMarkdown(project: Project) {
    return `
# ${project.name}

## Config
\`\`\`json
${JSON.stringify(project.config, null, 2)}
\`\`\`
`
}

function useCurrentBranch(project: Project): { isLoading: boolean; currentBranch: string | undefined } {
    const { isLoading, data: currentBranch } = useExec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: project.fullPath })
    return { isLoading, currentBranch }
}

function useCurrentCommit(project: Project): { isLoading: boolean; currentCommit: Commit | undefined } {
    const parseOutput = ({ stdout }: { stdout: string }) => {
        const lines = stdout.split('\n')

        return {
            hash: lines[0],
            authorName: lines[1],
            authorEmail: lines[2],
            date: new Date(lines[3]).toLocaleString(),
            message: lines.slice(4).join('\n'),
        }
    }

    const { isLoading, data: currentCommit } = useExec('git', ['show', '-s', '--date=local', '--format=%H%n%an%n%ae%n%ad%n%B'], { cwd: project.fullPath, parseOutput })

    return { isLoading, currentCommit }
}

function MetadataUrls({ project }: { project: Project }) {
    if (!project.config.urls) {
        return null
    }

    return (
        <React.Fragment>
            {Object.entries(project.config.urls).map(([key, value], i) => {
                if (!value) {
                    return null
                }

                return (
                    <Detail.Metadata.Link
                        key={key + i}
                        title=""
                        target={value}
                        text={key}
                    />
                )
            })}
        </React.Fragment>
    )
}

function MetadataGitRemotes({ project }: { project: Project }) {
    return (
        <React.Fragment>
            {project.gitRemotes.map((remote, i) => {
                return (
                    <Detail.Metadata.Link
                        key={remote.name + i}
                        title=""
                        target={remote.url}
                        text={`${remote.hostDisplayName} (${remote.name})`}
                    />
                )
            })}
        </React.Fragment>
    )
}

export default function ProjectDetail({ project }: ProjectDetailProps) {
    const { isLoading: isBranchLoading, currentBranch } = useCurrentBranch(project)
    const { isLoading: isCommitLoading, currentCommit } = useCurrentCommit(project)

    const [isShowingConfig, setIsShowingConfig] = useState(false)

    const markdown = isShowingConfig ? getConfigMarkdown(project) : getDefaultMarkdown(project, currentCommit)

    return (
        <Detail
            markdown={markdown}
            navigationTitle={project.name}
            isLoading={isBranchLoading || isCommitLoading}
            metadata={
                <Detail.Metadata>
                    <Detail.Metadata.Label
                        title="Full Path"
                        text={project.displayPath}
                    />
                    <Detail.Metadata.TagList title="Main Directory">
                        <Detail.Metadata.TagList.Item
                            text={project.primaryDirectory.name}
                            color={project.primaryDirectory.color}
                        />
                    </Detail.Metadata.TagList>
                    <Detail.Metadata.TagList title="Branch">
                        <Detail.Metadata.TagList.Item
                            text={currentBranch}
                            color={Color.Blue}
                        />
                    </Detail.Metadata.TagList>
                    {project.gitRemotes && project.gitRemotes.length > 0 && <Detail.Metadata.Separator />}
                    <MetadataGitRemotes project={project} />
                    {project.config.urls && Object.keys(project.config.urls).length > 0 && <Detail.Metadata.Separator />}
                    <MetadataUrls project={project} />
                </Detail.Metadata>
            }
            actions={
                <ActionPanel>
                    <Action
                        title={isShowingConfig ? 'Hide Config' : 'Show Config'}
                        icon={Icon.Cog}
                        onAction={() => setIsShowingConfig(!isShowingConfig)}
                    />
                    <Config project={project} />
                    <OpenUrl project={project} />
                    <OpenGitRemotes project={project} />
                    <Copy project={project} />
                    <Git project={project} />
                    <Action.ShowInFinder
                        title="Show in Finder"
                        path={project.fullPath}
                        shortcut={{ modifiers: ['cmd'], key: 'f' }}
                    />
                    <Action.OpenWith
                        title="Open With"
                        path={project.fullPath}
                        shortcut={{ modifiers: ['cmd', 'opt'], key: 'o' }}
                    />
                </ActionPanel>
            }
        />
    )
}
