import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Action, ActionPanel, List, Icon, openExtensionPreferences } from '@raycast/api'
import { useCachedPromise, useCachedState } from '@raycast/utils'
import { existsSync } from 'fs'

import { clearCache, fetchGitHealthForProjects, fetchPrimaryDirectories, fetchProjects, getAllProjectTags, preferences, resolveUserPath } from './helpers'
import { DirectoriesDropdown, useDirectory } from './components/DirectoriesDropdown'
import ProjectListItem from './components/ProjectListItem'
import { GitHealth, groupByDirectory, GroupedProjectList, Project, ProjectList, sortGroupedProjectsByFavorite } from './project'

const GIT_HEALTH_FILTERS = new Set(['needs-attention', 'dirty', 'ahead', 'behind', 'no-upstream'])
const GIT_HEALTH_BATCH_INTERVAL = 120

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError'
}

function getResolvedProjectsPath(): string {
    return resolveUserPath(preferences.projectsPath)
}

export default function Command() {
    const { directory } = useDirectory()
    const [selectedTags, setSelectedTags] = useCachedState<string[]>('selectedTags', [])
    const [gitHealthByPath, setGitHealthByPath] = useState<Record<string, GitHealth | null>>({})
    const [isLoadingGitHealth, setIsLoadingGitHealth] = useState(false)
    const pendingGitHealthByPath = useRef<Record<string, GitHealth | null>>({})
    const gitHealthFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const {
        data: rawProjects,
        isLoading: isLoadingProjects,
        revalidate,
    } = useCachedPromise(fetchProjects, [], {
        keepPreviousData: true,
        initialData: [],
    })

    const isGitHealthFilterSelected = Boolean(directory && GIT_HEALTH_FILTERS.has(directory))
    const shouldLoadGitHealth = preferences.showGitInfoInList !== false || isGitHealthFilterSelected

    useEffect(() => {
        let isMounted = true
        const abortController = new AbortController()

        const flushPendingGitHealth = () => {
            if (!isMounted) {
                return
            }

            const pendingGitHealth = pendingGitHealthByPath.current
            pendingGitHealthByPath.current = {}
            gitHealthFlushTimer.current = null

            if (Object.keys(pendingGitHealth).length > 0) {
                setGitHealthByPath((currentGitHealthByPath) => ({
                    ...currentGitHealthByPath,
                    ...pendingGitHealth,
                }))
            }
        }

        const scheduleGitHealthFlush = () => {
            if (gitHealthFlushTimer.current) {
                return
            }

            gitHealthFlushTimer.current = setTimeout(flushPendingGitHealth, GIT_HEALTH_BATCH_INTERVAL)
        }

        if (!rawProjects?.length || !shouldLoadGitHealth) {
            setGitHealthByPath({})
            setIsLoadingGitHealth(false)
            return
        }

        setGitHealthByPath({})
        setIsLoadingGitHealth(true)

        fetchGitHealthForProjects(
            rawProjects,
            (fullPath, gitHealth) => {
                if (isMounted) {
                    pendingGitHealthByPath.current[fullPath] = gitHealth
                    scheduleGitHealthFlush()
                }
            },
            abortController.signal,
        )
            .then((nextGitHealthByPath) => {
                if (isMounted) {
                    if (gitHealthFlushTimer.current) {
                        clearTimeout(gitHealthFlushTimer.current)
                        gitHealthFlushTimer.current = null
                    }
                    pendingGitHealthByPath.current = {}
                    setGitHealthByPath(nextGitHealthByPath)
                }
            })
            .catch((error) => {
                if (abortController.signal.aborted || isAbortError(error)) {
                    return
                }

                console.error('Failed to fetch Git health:', error)
                if (isMounted) {
                    setGitHealthByPath({})
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoadingGitHealth(false)
                }
            })

        return () => {
            isMounted = false
            abortController.abort()
            pendingGitHealthByPath.current = {}
            if (gitHealthFlushTimer.current) {
                clearTimeout(gitHealthFlushTimer.current)
                gitHealthFlushTimer.current = null
            }
        }
    }, [rawProjects, shouldLoadGitHealth])

    const projects = useMemo(() => {
        if (!rawProjects?.length) return []

        return rawProjects.map((project) => {
            if (!Object.prototype.hasOwnProperty.call(gitHealthByPath, project.fullPath)) {
                return project
            }

            const projectWithGitHealth = new Project(project)
            projectWithGitHealth.gitHealth = gitHealthByPath[project.fullPath]
            return projectWithGitHealth
        })
    }, [rawProjects, gitHealthByPath])

    const directories = useMemo(() => {
        if (!projects.length) return []
        return fetchPrimaryDirectories(projects)
    }, [projects])

    const availableTags = useMemo(() => getAllProjectTags(projects), [projects])

    const filteredProjects = useMemo(() => {
        if (!projects.length) return []

        return projects.filter((project: Project) => {
            if (selectedTags.length > 0 && !selectedTags.every((tag) => project.tags.includes(tag))) {
                return false
            }

            if (!directory || directory === 'all') return true
            if (directory === 'favorites') return project.isFavorite
            if (directory === 'needs-attention') return Boolean(project.gitHealth?.isDirty || project.gitHealth?.ahead || project.gitHealth?.behind || project.gitHealth?.hasUpstream === false)
            if (directory === 'dirty') return Boolean(project.gitHealth?.isDirty)
            if (directory === 'ahead') return Boolean(project.gitHealth && project.gitHealth.ahead > 0)
            if (directory === 'behind') return Boolean(project.gitHealth && project.gitHealth.behind > 0)
            if (directory === 'no-upstream') return project.gitHealth?.hasUpstream === false
            if (directory === 'recent') return Boolean(project.lastOpenedAt)
            return project.primaryDirectory.name === directory
        })
    }, [projects, directory, selectedTags])

    const processedProjects = useMemo(() => {
        if (!filteredProjects.length) return null

        const projectsGroupingEnabled = preferences.enableProjectsGrouping

        if (projectsGroupingEnabled) {
            const grouped = groupByDirectory(filteredProjects)

            // When "all" is selected, create special groups at the top
            if (!directory || directory === 'all') {
                const shouldShowRecentlyOpenedSection = preferences.showRecentlyOpenedInList !== false
                const recentProjects = shouldShowRecentlyOpenedSection
                    ? filteredProjects
                          .filter((project) => project.lastOpenedAt)
                          .sort((a, b) => new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime())
                          .slice(0, 8)
                    : []
                const recentProjectPaths = new Set(recentProjects.map((project) => project.fullPath))
                const favoritesFromAllGroups: Project[] = []
                const groupsWithoutFavorites: GroupedProjectList = {}

                // Extract favorites from all groups
                Object.entries(grouped).forEach(([dirName, projects]) => {
                    const favorites = projects.filter((p) => p.isFavorite && !recentProjectPaths.has(p.fullPath))
                    const nonFavorites = projects.filter((p) => !p.isFavorite && !recentProjectPaths.has(p.fullPath))

                    favoritesFromAllGroups.push(...favorites)

                    if (nonFavorites.length > 0) {
                        groupsWithoutFavorites[dirName] = nonFavorites.sort((a, b) => a.name.localeCompare(b.name))
                    }
                })

                // Create the final grouped structure
                const result: GroupedProjectList = {}

                if (recentProjects.length > 0) {
                    result['Recently Opened'] = recentProjects
                }

                // Add Favorites group first if there are any favorites
                if (favoritesFromAllGroups.length > 0) {
                    result['Favorites'] = favoritesFromAllGroups.sort((a, b) => a.name.localeCompare(b.name))
                }

                // Add other groups sorted alphabetically
                const sortedGroupNames = Object.keys(groupsWithoutFavorites).sort()
                sortedGroupNames.forEach((groupName) => {
                    result[groupName] = groupsWithoutFavorites[groupName]
                })

                return result
            } else {
                // When a specific folder is selected, show favorites at the top of that group
                return sortGroupedProjectsByFavorite(grouped)
            }
        }

        return [...filteredProjects].sort((a, b) => {
            if (directory === 'recent') {
                return new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime()
            }

            if (a.isFavorite === b.isFavorite) {
                return a.name.localeCompare(b.name)
            }
            return a.isFavorite ? -1 : 1
        })
    }, [filteredProjects, directory])

    const isGrouped = preferences.enableProjectsGrouping
    const isLoading = isLoadingProjects || (isGitHealthFilterSelected && isLoadingGitHealth)
    const showEmptyView = !isLoading && (!processedProjects || (Array.isArray(processedProjects) && processedProjects.length === 0))
    const emptyViewTitle = useMemo(() => {
        if (isLoadingProjects) {
            return 'Scanning repositories...'
        }

        if (!rawProjects?.length) {
            return `No projects found in ${preferences.projectsPath}`
        }

        if (isGitHealthFilterSelected) {
            return 'No repositories match this health filter'
        }

        if (selectedTags.length > 0) {
            return 'No repositories match the selected tags'
        }

        if (directory === 'favorites') {
            return 'No favorite repositories yet'
        }

        if (directory === 'recent') {
            return 'No recently opened repositories yet'
        }

        return 'No repositories match this filter'
    }, [directory, isGitHealthFilterSelected, isLoadingProjects, rawProjects?.length, selectedTags.length])

    const emptyViewDescription = useMemo(() => {
        if (isGitHealthFilterSelected && !isLoadingGitHealth) {
            return 'Try another health filter or refresh Git status.'
        }

        if (selectedTags.length > 0) {
            return `Selected tags: ${selectedTags.join(', ')}`
        }

        if (!rawProjects?.length) {
            return 'Check your projects path in preferences or refresh after creating a repository.'
        }

        return undefined
    }, [isGitHealthFilterSelected, isLoadingGitHealth, rawProjects?.length, selectedTags])

    const handleFavoriteChange = () => {
        revalidate()
    }

    const handleProjectChange = () => {
        revalidate()
    }

    const handleClearCache = () => {
        clearCache(false)
        revalidate()
    }

    const resolvedProjectsPath = getResolvedProjectsPath()
    const projectsPathExists = existsSync(resolvedProjectsPath)

    const listActionItems = (
        <React.Fragment>
            <Action
                title="Refresh Repositories"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
                onAction={revalidate}
            />
            {selectedTags.length > 0 && (
                <Action
                    title="Clear Tag Filter"
                    icon={Icon.XMarkCircle}
                    onAction={() => setSelectedTags([])}
                />
            )}
            {projectsPathExists && (
                <Action.ShowInFinder
                    title="Reveal Projects Folder"
                    path={resolvedProjectsPath}
                />
            )}
            <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                shortcut={{ modifiers: ['cmd', 'shift'], key: ',' }}
                onAction={openExtensionPreferences}
            />
            {preferences.enableProjectsCaching && (
                <Action
                    title="Clear Cache"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'delete' }}
                    onAction={handleClearCache}
                />
            )}
        </React.Fragment>
    )

    const listActions = <ActionPanel>{listActionItems}</ActionPanel>

    return (
        <List
            isLoading={isLoading}
            searchBarAccessory={
                directories.length > 0 ? (
                    <DirectoriesDropdown
                        directories={directories}
                        availableTags={availableTags}
                        selectedTags={selectedTags}
                        onSelectedTagsChange={setSelectedTags}
                    />
                ) : undefined
            }
            actions={listActions}
        >
            {showEmptyView && (
                <List.EmptyView
                    icon={Icon.MagnifyingGlass}
                    title={emptyViewTitle}
                    description={emptyViewDescription}
                    actions={listActions}
                />
            )}
            {processedProjects && isGrouped
                ? Object.entries(processedProjects as GroupedProjectList).map(([directoryName, projects]) => (
                      <List.Section
                          title={directoryName}
                          subtitle={projects.length.toString()}
                          key={directoryName}
                      >
                          {projects.map((project: Project) => (
                              <ProjectListItem
                                  key={`${project.fullPath}-${project.name}`}
                                  project={project}
                                  directories={directories}
                                  availableTags={availableTags}
                                  onFavoriteChange={handleFavoriteChange}
                                  onProjectChange={handleProjectChange}
                                  listActions={listActionItems}
                              />
                          ))}
                      </List.Section>
                  ))
                : (processedProjects as ProjectList)?.map((project: Project) => (
                      <ProjectListItem
                          key={`${project.fullPath}-${project.name}`}
                          project={project}
                          directories={directories}
                          availableTags={availableTags}
                          onFavoriteChange={handleFavoriteChange}
                          onProjectChange={handleProjectChange}
                          listActions={listActionItems}
                      />
                  ))}
        </List>
    )
}
