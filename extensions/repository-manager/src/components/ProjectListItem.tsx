import React, { useMemo, useCallback } from 'react'
import { Action, ActionPanel, Color, Icon, List, getPreferenceValues, useNavigation } from '@raycast/api'
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
import AddToFavorites from './AddToFavorites'
import GitCommitsDetail from './GitCommitsDetail'
import GitStatisticsDetail from './GitStatisticsDetail'

type ProjectListItemProps = {
    project: Project
    directories: Directory[]
    onFavoriteChange: () => void
}

const ProjectListItem = React.memo(({ project, directories, onFavoriteChange }: ProjectListItemProps) => {
    const preferences = getPreferenceValues()
    const { push } = useNavigation()

    const primaryDirectory = useMemo(() => {
        return directories.find((dir) => dir.name === project.primaryDirectory.name)
    }, [directories, project.primaryDirectory.name])

    const actionsMap = useMemo<Record<PrimaryAction, React.JSX.Element>>(
        () => ({
            'start-development': (
                <StartDevelopment
                    project={project}
                    key="start-development"
                />
            ),
            'open-in-editor': (
                <OpenInEditor
                    project={project}
                    key="open-in-editor"
                />
            ),
            'open-in-terminal': (
                <OpenInTerminal
                    project={project}
                    key="open-in-terminal"
                />
            ),
            'open-url': (
                <OpenUrl
                    project={project}
                    key="open-url"
                />
            ),
            'open-git-remotes': (
                <OpenGitRemotes
                    project={project}
                    key="open-git-remotes"
                />
            ),
        }),
        [project],
    )

    const orderedActions = useMemo(() => {
        const defaultOrder: PrimaryAction[] = ['open-in-editor', 'start-development', 'open-in-terminal', 'open-url', 'open-git-remotes']
        const primaryAction = preferences.primaryAction as PrimaryAction
        return [primaryAction, ...defaultOrder.filter((action) => action !== primaryAction)]
    }, [preferences.primaryAction])

    const handleGitCommits = useCallback(() => {
        push(<GitCommitsDetail project={project} />)
    }, [push, project])

    const handleRepoStatistics = useCallback(() => {
        push(<GitStatisticsDetail project={project} />)
    }, [push, project])

    const accessories = useMemo(
        () => [
            {
                icon: project.isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : null,
                tooltip: project.isFavorite ? 'Favorite' : null,
            },
            { text: project.displayPath, tooltip: 'Full Path' },
            {
                tag: {
                    value: project.primaryDirectory.name,
                    color: primaryDirectory?.icon?.tintColor || Color.Orange,
                },
                tooltip: 'Main Directory',
            },
        ],
        [project.isFavorite, project.displayPath, project.primaryDirectory.name, primaryDirectory?.icon?.tintColor],
    )

    return (
        <List.Item
            icon={Icon.Folder}
            title={project.name}
            subtitle={project.description || ''}
            accessories={accessories}
            actions={
                <ActionPanel>
                    <ActionPanel.Section title="Open project">{orderedActions.map((action) => actionsMap[action])}</ActionPanel.Section>
                    <ActionPanel.Section title="Actions">
                        <AddToFavorites
                            project={project}
                            onFavoriteChange={onFavoriteChange}
                        />
                        <Action
                            title="Git Commits"
                            icon={Icon.List}
                            shortcut={{ modifiers: ['cmd'], key: 'g' }}
                            onAction={handleGitCommits}
                        />
                        <Action
                            title="Repo Statistics"
                            icon={Icon.BarChart}
                            shortcut={{ modifiers: ['cmd'], key: 's' }}
                            onAction={handleRepoStatistics}
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
})

ProjectListItem.displayName = 'ProjectListItem'

export default ProjectListItem
