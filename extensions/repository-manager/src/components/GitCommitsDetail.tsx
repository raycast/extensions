import { Action, ActionPanel, Detail, Icon, List, useNavigation, Clipboard, Toast, showToast } from '@raycast/api'
import { Project } from '../project'
import { useExec } from '@raycast/utils'
import { OpenInEditor, OpenInTerminal } from './Open'
import OpenGitRemotes from './OpenGitRemotes'
import { useState } from 'react'

type GitCommitsDetailProps = {
    project: Project
}

type Commit = {
    hash: string
    shortHash: string
    message: string
    author: string
    date: string
    dateRelative: string
}

type CommitDetailProps = {
    project: Project
    commit: Commit
}

function CommitDetail({ project, commit }: CommitDetailProps) {
    const { pop } = useNavigation()
    const { isLoading, data: commitDetails } = useExec('git', ['show', commit.hash, '--stat'], { cwd: project.fullPath })
    const { data: commitDiff } = useExec('git', ['show', commit.hash], { cwd: project.fullPath })

    const markdown = `
# ${commit.message}

## Commit Details
- **Hash**: \`${commit.hash}\`
- **Author**: ${commit.author}
- **Date**: ${commit.date}

## Changes
\`\`\`
${commitDetails || 'Loading...'}
\`\`\`

## Diff
\`\`\`diff
${commitDiff || 'Loading...'}
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
                </ActionPanel>
            }
        />
    )
}

export default function GitCommitsDetail({ project }: GitCommitsDetailProps) {
    const { push, pop } = useNavigation()
    const [selectedBranch, setSelectedBranch] = useState<string>('HEAD')

    // Get list of branches
    const { data: branchesData } = useExec('git', ['branch', '-a'], { cwd: project.fullPath })

    // Get commits for selected branch
    const { isLoading, data: commitsData } = useExec('git', ['log', selectedBranch, '--pretty=format:%H|%h|%s|%an|%ad|%ar', '--date=local', '-50'], { cwd: project.fullPath })

    const branches = branchesData
        ? branchesData
              .split('\n')
              .map((branch) =>
                  branch
                      .trim()
                      .replace(/^\*\s*/, '')
                      .replace(/^remotes\//, ''),
              )
              .filter((branch) => branch && !branch.includes('->'))
              .map((branch) => ({ title: branch, value: branch }))
        : []

    // Add HEAD option at the beginning
    const branchOptions = [{ title: 'Current Branch (HEAD)', value: 'HEAD' }, ...branches]

    const commits: Commit[] = commitsData
        ? commitsData
              .split('\n')
              .map((line) => {
                  const [hash, shortHash, message, author, date, dateRelative] = line.split('|')
                  return { hash, shortHash, message, author, date, dateRelative }
              })
              .filter((commit) => commit.hash && commit.message)
        : []

    return (
        <List
            isLoading={isLoading}
            searchBarPlaceholder="Search commits by message, author, or hash..."
            searchBarAccessory={
                <List.Dropdown
                    tooltip="Select Branch"
                    value={selectedBranch}
                    onChange={setSelectedBranch}
                >
                    {branchOptions.map((branch) => (
                        <List.Dropdown.Item
                            key={branch.value}
                            title={branch.title}
                            value={branch.value}
                        />
                    ))}
                </List.Dropdown>
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
                </ActionPanel>
            }
        >
            {commits.length === 0 && !isLoading ? (
                <List.EmptyView
                    title="No commits found"
                    description={`No commits found for branch: ${selectedBranch}`}
                />
            ) : (
                commits.map((commit) => (
                    <List.Item
                        key={commit.hash}
                        title={commit.message}
                        subtitle={`by ${commit.author}`}
                        accessories={[
                            { text: commit.shortHash, tooltip: `Full hash: ${commit.hash}` },
                            { text: commit.dateRelative, tooltip: commit.date },
                        ]}
                        actions={
                            <ActionPanel>
                                <Action
                                    title="View Commit Details"
                                    icon={Icon.Eye}
                                    onAction={() =>
                                        push(
                                            <CommitDetail
                                                project={project}
                                                commit={commit}
                                            />,
                                        )
                                    }
                                />
                                <Action
                                    title="Copy Commit Hash"
                                    icon={Icon.Clipboard}
                                    shortcut={{ modifiers: ['cmd'], key: 'c' }}
                                    onAction={async () => {
                                        Clipboard.copy(commit.hash)
                                        await showToast({
                                            style: Toast.Style.Success,
                                            title: 'Commit hash copied',
                                            message: `Commit hash: ${commit.hash}`,
                                        })
                                    }}
                                />
                                <Action
                                    title="Copy Short Hash"
                                    icon={Icon.Clipboard}
                                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
                                    onAction={async () => {
                                        Clipboard.copy(commit.shortHash)
                                        await showToast({
                                            style: Toast.Style.Success,
                                            title: 'Short hash copied',
                                            message: `Short hash: ${commit.shortHash}`,
                                        })
                                    }}
                                />
                                <Action
                                    title="Copy Commit Message"
                                    icon={Icon.Clipboard}
                                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'm' }}
                                    onAction={async () => {
                                        Clipboard.copy(commit.message)
                                        await showToast({
                                            style: Toast.Style.Success,
                                            title: 'Message copied',
                                            message: `Message: ${commit.message}`,
                                        })
                                    }}
                                />
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
                ))
            )}
        </List>
    )
}
