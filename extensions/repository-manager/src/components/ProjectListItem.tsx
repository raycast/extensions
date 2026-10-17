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
import ProjectScripts from './ProjectScripts'
import { Directory } from './DirectoriesDropdown'
import { PrimaryAction } from '../helpers'
import AddToFavorites from './AddToFavorites'
import GitStatisticsDetail from './GitStatisticsDetail'
import { ManageProjectTags } from './ProjectTags'
import { GenerateAIRepoBriefAction } from './AIRepoBrief'

type ProjectListItemProps = {
    project: Project
    directories: Directory[]
    availableTags: string[]
    onFavoriteChange: () => void
    onProjectChange: () => void
    listActions?: React.JSX.Element
}

const ProjectListItem = React.memo(({ project, directories, availableTags, onFavoriteChange, onProjectChange, listActions }: ProjectListItemProps) => {
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

    const handleRepoStatistics = useCallback(() => {
        push(<GitStatisticsDetail project={project} />)
    }, [push, project])

    const accessories = useMemo(() => {
        const health = project.gitHealth
        const healthAccessories = []
        const visibleTags = project.tags.slice(0, 3)
        const hiddenTagsCount = Math.max(project.tags.length - visibleTags.length, 0)
        const tagAccessories = visibleTags.map((tag) => ({
            tag: { value: tag, color: Color.Blue },
            tooltip: `Tag: ${tag}`,
        }))

        if (hiddenTagsCount > 0) {
            tagAccessories.push({
                tag: { value: `+${hiddenTagsCount}`, color: Color.SecondaryText },
                tooltip: project.tags.slice(visibleTags.length).join(', '),
            })
        }

        if (preferences.showGitInfoInList !== false) {
            if (project.lastOpenedAt) {
                healthAccessories.push({
                    icon: { source: Icon.Clock, tintColor: Color.SecondaryText },
                    tooltip: `Recently opened ${new Date(project.lastOpenedAt).toLocaleString()}`,
                })
            }

            if (health?.isDirty) {
                const untrackedSummary = health.untrackedFiles === null ? 'untracked files present' : `${health.untrackedFiles} untracked`

                healthAccessories.push({
                    tag: { value: `${health.changedFiles} changed`, color: Color.Orange },
                    tooltip: `${health.stagedFiles} staged, ${health.unstagedFiles} unstaged, ${untrackedSummary}`,
                })
            }

            if (health && health.ahead > 0) {
                healthAccessories.push({
                    tag: { value: `↑ ${health.ahead}`, color: Color.Green },
                    tooltip: `Ahead of ${health.upstream || 'upstream'} by ${health.ahead} commits`,
                })
            }

            if (health && health.behind > 0) {
                healthAccessories.push({
                    tag: { value: `↓ ${health.behind}`, color: Color.Red },
                    tooltip: `Behind ${health.upstream || 'upstream'} by ${health.behind} commits`,
                })
            }

            if (health?.hasUpstream === false) {
                healthAccessories.push({
                    tag: { value: 'No upstream', color: Color.SecondaryText },
                    tooltip: 'Current branch has no upstream branch',
                })
            }
        }

        return [
            {
                icon: project.isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : null,
                tooltip: project.isFavorite ? 'Favorite' : null,
            },
            ...tagAccessories,
            ...healthAccessories,
            { text: project.displayPath, tooltip: 'Full Path' },
            {
                tag: {
                    value: project.primaryDirectory.name,
                    color: primaryDirectory?.icon?.tintColor || Color.Orange,
                },
                tooltip: 'Main Directory',
            },
        ]
    }, [preferences.showGitInfoInList, project.gitHealth, project.isFavorite, project.tags, project.displayPath, project.primaryDirectory.name, project.lastOpenedAt, primaryDirectory?.icon?.tintColor])

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
                        <Action.CopyToClipboard
                            title="Copy Path"
                            content={project.fullPath}
                            icon={Icon.Clipboard}
                            shortcut={{ modifiers: ['cmd'], key: 'c' }}
                        />
                        <AddToFavorites
                            project={project}
                            onFavoriteChange={onFavoriteChange}
                        />
                        <ManageProjectTags
                            project={project}
                            availableTags={availableTags}
                            onTagsChange={onProjectChange}
                        />
                        <Action
                            title="Repo Statistics"
                            icon={Icon.BarChart}
                            shortcut={{ modifiers: ['cmd'], key: 's' }}
                            onAction={handleRepoStatistics}
                        />
                        <GenerateAIRepoBriefAction project={project} />
                        <ProjectScripts project={project} />
                        <Config
                            project={project}
                            onConfigChange={onProjectChange}
                        />
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
                    {listActions && <ActionPanel.Section title="Repository List">{listActions}</ActionPanel.Section>}
                </ActionPanel>
            }
        />
    )
})

ProjectListItem.displayName = 'ProjectListItem'

export default ProjectListItem
