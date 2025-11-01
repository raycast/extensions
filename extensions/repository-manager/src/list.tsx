import React, { useMemo } from 'react'
import { List, Icon } from '@raycast/api'
import { useCachedPromise } from '@raycast/utils'
import { homedir } from 'os'

import { fetchPrimaryDirectories, fetchProjects, preferences } from './helpers'
import { DirectoriesDropdown, useDirectory } from './components/DirectoriesDropdown'
import ProjectListItem from './components/ProjectListItem'
import { groupByDirectory, GroupedProjectList, Project, ProjectList, sortGroupedProjectsByFavorite } from './project'

export default function Command() {
    const { directory } = useDirectory()

    const {
        data: rawProjects,
        isLoading: isLoadingProjects,
        revalidate,
    } = useCachedPromise(fetchProjects, [], {
        keepPreviousData: true,
        initialData: [],
    })

    const directories = useMemo(() => {
        if (!rawProjects?.length) return []
        return fetchPrimaryDirectories(rawProjects)
    }, [rawProjects])

    const filteredProjects = useMemo(() => {
        if (!rawProjects?.length) return []

        return rawProjects.filter((project: Project) => {
            if (!directory || directory === 'all') return true
            if (directory === 'favorites') return project.isFavorite
            return project.primaryDirectory.name === directory
        })
    }, [rawProjects, directory])

    const processedProjects = useMemo(() => {
        if (!filteredProjects.length) return null

        const projectsGroupingEnabled = preferences.enableProjectsGrouping

        if (projectsGroupingEnabled) {
            const grouped = groupByDirectory(filteredProjects)

            // When "all" is selected, create a special "Favorites" group at the top
            if (!directory || directory === 'all') {
                const favoritesFromAllGroups: Project[] = []
                const groupsWithoutFavorites: GroupedProjectList = {}

                // Extract favorites from all groups
                Object.entries(grouped).forEach(([dirName, projects]) => {
                    const favorites = projects.filter((p) => p.isFavorite)
                    const nonFavorites = projects.filter((p) => !p.isFavorite)

                    favoritesFromAllGroups.push(...favorites)

                    if (nonFavorites.length > 0) {
                        groupsWithoutFavorites[dirName] = nonFavorites.sort((a, b) => a.name.localeCompare(b.name))
                    }
                })

                // Create the final grouped structure
                const result: GroupedProjectList = {}

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
            if (a.isFavorite === b.isFavorite) {
                return a.name.localeCompare(b.name)
            }
            return a.isFavorite ? -1 : 1
        })
    }, [filteredProjects, directory])

    const isGrouped = preferences.enableProjectsGrouping
    const showEmptyView = !isLoadingProjects && (!processedProjects || (Array.isArray(processedProjects) && processedProjects.length === 0))

    const handleFavoriteChange = () => {
        revalidate()
    }

    return (
        <List
            isLoading={isLoadingProjects || !processedProjects}
            searchBarAccessory={directories.length > 0 ? <DirectoriesDropdown directories={directories} /> : undefined}
        >
            {showEmptyView && (
                <List.EmptyView
                    icon={Icon.MagnifyingGlass}
                    title={`No project found in directory ${preferences.projectsPath.replace(homedir(), '~')}`}
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
                                  onFavoriteChange={handleFavoriteChange}
                              />
                          ))}
                      </List.Section>
                  ))
                : (processedProjects as ProjectList)?.map((project: Project) => (
                      <ProjectListItem
                          key={`${project.fullPath}-${project.name}`}
                          project={project}
                          directories={directories}
                          onFavoriteChange={handleFavoriteChange}
                      />
                  ))}
        </List>
    )
}
