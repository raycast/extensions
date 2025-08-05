import { Action, ActionPanel, Icon } from '@raycast/api'
import { Project } from '../project'

type OpenGitRemotesProps = {
    project: Project
}

export default function OpenGitRemotes({ project }: OpenGitRemotesProps) {
    if (project.gitRemotes.length === 0) {
        return null
    }

    if (project.gitRemotes.length === 1) {
        const remote = project.gitRemotes[0]
        return (
            <Action.OpenInBrowser
                title={`Open on ${remote.hostDisplayName} (${remote.name})`}
                key={`open remote ${remote.name}`}
                url={remote.url}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'o' }}
                icon={remote.icon}
            />
        )
    }

    return (
        <ActionPanel.Submenu
            title="Open Git Remotes"
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'o' }}
            icon={Icon.Globe}
        >
            {project.gitRemotes.map((remote, i) => {
                return (
                    <Action.OpenInBrowser
                        title={`Open on ${remote.hostDisplayName} (${remote.name})`}
                        key={`open remote ${remote.name}-${i}`}
                        url={remote.url}
                        icon={remote.icon}
                    />
                )
            })}
        </ActionPanel.Submenu>
    )
}
