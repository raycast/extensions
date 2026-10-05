import { Action, ActionPanel, Icon } from '@raycast/api'
import { Project, Repo } from '../project'
import { markProjectOpened } from '../helpers'

type OpenGitRemotesProps = {
    project: Project
}

type RemotePage = {
    title: string
    url: string
    icon: Icon
}

function getRemotePages(remote: Repo): RemotePage[] {
    const host = remote.host.toLowerCase()

    if (host.includes('github')) {
        return [
            { title: 'Open Pull Requests', url: `${remote.url}/pulls`, icon: Icon.TwoArrowsClockwise },
            { title: 'Open Issues', url: `${remote.url}/issues`, icon: Icon.Bug },
            { title: 'Open Actions', url: `${remote.url}/actions`, icon: Icon.Hammer },
            { title: 'Open Compare', url: `${remote.url}/compare`, icon: Icon.ArrowRight },
            { title: 'Open New Pull Request', url: `${remote.url}/compare`, icon: Icon.PlusCircle },
        ]
    }

    if (host.includes('gitlab')) {
        return [
            { title: 'Open Merge Requests', url: `${remote.url}/-/merge_requests`, icon: Icon.TwoArrowsClockwise },
            { title: 'Open Issues', url: `${remote.url}/-/issues`, icon: Icon.Bug },
            { title: 'Open Pipelines', url: `${remote.url}/-/pipelines`, icon: Icon.Hammer },
            { title: 'Open Compare', url: `${remote.url}/-/compare`, icon: Icon.ArrowRight },
            { title: 'Open New Merge Request', url: `${remote.url}/-/merge_requests/new`, icon: Icon.PlusCircle },
        ]
    }

    if (host.includes('bitbucket')) {
        return [
            { title: 'Open Pull Requests', url: `${remote.url}/pull-requests`, icon: Icon.TwoArrowsClockwise },
            { title: 'Open Issues', url: `${remote.url}/issues`, icon: Icon.Bug },
            { title: 'Open Pipelines', url: `${remote.url}/pipelines`, icon: Icon.Hammer },
            { title: 'Open Compare', url: `${remote.url}/branches/compare`, icon: Icon.ArrowRight },
            { title: 'Open New Pull Request', url: `${remote.url}/pull-requests/new`, icon: Icon.PlusCircle },
        ]
    }

    return []
}

function OpenRemoteAction({ project, remote, shortcut }: { project: Project; remote: Repo; shortcut?: { modifiers: ('cmd' | 'shift')[]; key: 'o' } }) {
    return (
        <Action.OpenInBrowser
            title={`Open on ${remote.hostDisplayName} (${remote.name})`}
            key={`open remote ${remote.name}`}
            url={remote.url}
            shortcut={shortcut}
            icon={remote.icon}
            onOpen={() => markProjectOpened(project)}
        />
    )
}

function OpenRemotePages({ project, remote }: { project: Project; remote: Repo }) {
    const pages = getRemotePages(remote)

    if (pages.length === 0) {
        return null
    }

    return (
        <ActionPanel.Submenu
            title={`${remote.hostDisplayName} Pages (${remote.name})`}
            icon={remote.icon}
        >
            {pages.map((page) => (
                <Action.OpenInBrowser
                    key={`${remote.name}-${page.title}`}
                    title={page.title}
                    url={page.url}
                    icon={page.icon}
                    onOpen={() => markProjectOpened(project)}
                />
            ))}
        </ActionPanel.Submenu>
    )
}

export default function OpenGitRemotes({ project }: OpenGitRemotesProps) {
    if (project.gitRemotes.length === 0) {
        return null
    }

    if (project.gitRemotes.length === 1) {
        const remote = project.gitRemotes[0]
        return (
            <>
                <OpenRemoteAction
                    project={project}
                    remote={remote}
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'o' }}
                />
                <OpenRemotePages
                    project={project}
                    remote={remote}
                />
            </>
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
                    <ActionPanel.Submenu
                        title={`${remote.hostDisplayName} (${remote.name})`}
                        key={`open remote ${remote.name}-${i}`}
                        icon={remote.icon}
                    >
                        <OpenRemoteAction
                            project={project}
                            remote={remote}
                        />
                        {getRemotePages(remote).map((page) => (
                            <Action.OpenInBrowser
                                key={`${remote.name}-${page.title}`}
                                title={page.title}
                                url={page.url}
                                icon={page.icon}
                                onOpen={() => markProjectOpened(project)}
                            />
                        ))}
                    </ActionPanel.Submenu>
                )
            })}
        </ActionPanel.Submenu>
    )
}
