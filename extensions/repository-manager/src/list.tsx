import { List, Icon } from '@raycast/api'
import { fetchPrimaryDirectories, fetchProjects, preferences } from './helpers'
import { homedir } from 'os'
import { DirectoriesDropdown, useDirectory } from './components/DirectoriesDropdown'
import ProjectListItem from './components/ProjectListItem'
import { groupByDirectory, GroupedProjectList, Project, ProjectList } from './project'

export default function Command() {
    let projects: ProjectList | GroupedProjectList = fetchProjects()

    const { directory } = useDirectory()
    const directories = fetchPrimaryDirectories(projects as ProjectList)

    if (directory && directory !== 'all') {
        projects = (projects as ProjectList).filter((project: Project) => {
            return directory ? project.primaryDirectory.name === directory : true
        })
    }

    const projectsGroupingEnabled = preferences.enableProjectsGrouping
    if (projectsGroupingEnabled) {
        projects = groupByDirectory(projects as ProjectList)
    }

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
                ? Object.entries(projects as GroupedProjectList).map(([directory, projects]) => {
                      return (
                          <List.Section
                              title={directory}
                              subtitle={projects.length.toString()}
                              key={directory}
                          >
                              {projects.map((project: Project) => {
                                  return (
                                      <ProjectListItem
                                          key={project.name}
                                          project={project}
                                          directories={directories}
                                      />
                                  )
                              })}
                          </List.Section>
                      )
                  })
                : (projects as ProjectList).map((project: Project) => {
                      return (
                          <ProjectListItem
                              key={project.name}
                              project={project}
                              directories={directories}
                          />
                      )
                  })}
        </List>
    )
}
