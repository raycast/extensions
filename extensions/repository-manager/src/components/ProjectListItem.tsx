import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from '@raycast/api'
import { Project } from '../project'
import StartDevelopment from './StartDevelopment'
import { OpenInEditor, OpenInTerminal, OpenUrl } from './Open'
import OpenGitRemotes from './OpenGitRemotes'
import ProjectDetail from './ProjectDetail'
import Git from './Git'
import Config from './Config'
import { Copy } from './Copy'
import Cache from './Cache'
import { Directory } from './DirectoriesDropdown'
import { PrimaryAction } from '../helpers'
import React from 'react'
import AddToFavorites from './AddToFavorites'

type ProjectListItemProps = {
    project: Project
    directories: Directory[]
    onFavoriteChange: (project: Project) => void
}

export default function ProjectListItem({ project, directories, onFavoriteChange }: ProjectListItemProps) {
    const preferences = getPreferenceValues()

    const actionsMap: Record<PrimaryAction, JSX.Element> = {
        'start-development': <StartDevelopment project={project} />,
        'open-in-editor': <OpenInEditor project={project} />,
        'open-in-terminal': <OpenInTerminal project={project} />,
        'open-url': <OpenUrl project={project} />,
        'open-git-remotes': <OpenGitRemotes project={project} />,
    }

    const defaultOrder: PrimaryAction[] = ['open-in-editor', 'start-development', 'open-in-terminal', 'open-url', 'open-git-remotes']
    const primaryAction = preferences.primaryAction as PrimaryAction
    const actionOrder = [primaryAction, ...defaultOrder.filter((action) => action !== primaryAction)]

    const actions = () => {
        return (
            <>
                {actionOrder.map((action) => React.cloneElement(actionsMap[action], { key: action }))}
                <OpenUrl project={project} />
                <OpenGitRemotes project={project} />
            </>
        )
    }

    return (
        <List.Item
            key={project.name}
            icon={Icon.Folder}
            title={project.name}
            subtitle={project.description || ''}
            data-directory={project.primaryDirectory.name}
            accessories={[
                { icon: project.isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : null, tooltip: project.isFavorite ? 'Favorite' : null },
                { text: project.displayPath, tooltip: 'Full Path' },
                { tag: { value: project.primaryDirectory.name, color: directories.find((conf) => conf.name === project.primaryDirectory.name)?.icon?.tintColor || Color.Orange }, tooltip: 'Main Directory' },
            ]}
            actions={
                <ActionPanel>
                    <ActionPanel.Section title="Open project">{actions()}</ActionPanel.Section>
                    <ActionPanel.Section title="Actions">
                        <AddToFavorites
                            project={project}
                            onFavoriteChange={onFavoriteChange}
                        />
                        <Config project={project} />
                        <Copy project={project} />
                        <Action.Push
                            title="Details"
                            icon={Icon.Info}
                            shortcut={{ modifiers: ['cmd'], key: 'i' }}
                            target={<ProjectDetail project={project} />}
                        />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Extra Actions">
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
                        <Cache />
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    )
}
