import React, { useState, useEffect } from 'react'
import { List, Icon } from '@raycast/api'
import { fetchPrimaryDirectories, fetchProjects, preferences } from './helpers'
import { homedir } from 'os'
import { DirectoriesDropdown, Directory, useDirectory } from './components/DirectoriesDropdown'
import ProjectListItem from './components/ProjectListItem'
import { groupByDirectory, GroupedProjectList, Project, ProjectList, sortGroupedProjectsByFavorite } from './project'

export default function Command() {
    const [projects, setProjects] = useState<ProjectList | GroupedProjectList | null>(null)
    const [directories, setDirectories] = useState<Directory[] | null>(null)
    const [userHasFavoritedProjects, setUserHasFavoritedProjects] = useState<boolean>(false)
    const { directory } = useDirectory()

    useEffect(() => {
        async function fetchData() {
            let fetchedProjects: ProjectList | GroupedProjectList = await fetchProjects()

            const fetchedDirectories = fetchPrimaryDirectories(fetchedProjects as ProjectList)
            setDirectories(fetchedDirectories)

            if (directory) {
                fetchedProjects = (fetchedProjects as ProjectList).filter((project: Project) => {
                    if (directory === 'all') {
                        return true
                    }

                    if (directory === 'favorites') {
                        return project.isFavorite
                    }

                    return project.primaryDirectory.name === directory
                })
            }

            const projectsGroupingEnabled = preferences.enableProjectsGrouping
            if (projectsGroupingEnabled) {
                fetchedProjects = groupByDirectory(fetchedProjects as ProjectList)
                fetchedProjects = sortGroupedProjectsByFavorite(fetchedProjects as GroupedProjectList)
            } else {
                fetchedProjects = (fetchedProjects as ProjectList).sort((a, b) => {
                    if (a.isFavorite === b.isFavorite) {
                        return a.name.localeCompare(b.name)
                    }

                    return a.isFavorite ? -1 : 1
                })
            }

            setProjects(fetchedProjects)
            setUserHasFavoritedProjects(false)
        }

        fetchData()
    }, [directory, userHasFavoritedProjects])

    if (!projects) {
        return <List isLoading={true} />
    }

    const projectsGroupingEnabled = preferences.enableProjectsGrouping

    return (
        <List
            isLoading={!projects}
            searchBarAccessory={directories && <DirectoriesDropdown directories={directories} />}
        >
            <List.EmptyView
                icon={Icon.MagnifyingGlass}
                title={`No project found in directory ${preferences.projectsPath.replace(homedir(), '~')}`}
            />
            {projectsGroupingEnabled
                ? Object.entries(projects as GroupedProjectList).map(([directory, projects], index) => {
                      return (
                          <List.Section
                              title={directory}
                              subtitle={projects.length.toString()}
                              key={directory + index}
                          >
                              {projects.map((project: Project, i) => {
                                  return (
                                      <ProjectListItem
                                          key={project.name + i}
                                          project={project}
                                          directories={directories as Directory[]}
                                          onFavoriteChange={() => setUserHasFavoritedProjects(true)}
                                      />
                                  )
                              })}
                          </List.Section>
                      )
                  })
                : (projects as ProjectList).map((project: Project, i) => {
                      return (
                          <ProjectListItem
                              key={project.name + i}
                              project={project}
                              directories={directories as Directory[]}
                              onFavoriteChange={() => setUserHasFavoritedProjects(true)}
                          />
                      )
                  })}
        </List>
    )
}
