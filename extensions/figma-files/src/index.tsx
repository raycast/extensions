import { useState, useEffect } from 'react'
import fetch from 'node-fetch'
import { List, showToast, ToastStyle, getPreferenceValues } from '@raycast/api'

import type { File, ProjectFiles, TeamProjects } from './types'
import { loadFiles, storeFiles } from './utils'
import FileListItem from './components/FileListItem'
import { useVisitedFiles } from './hooks/useVisitedFiles'

export default function Command() {
  const [state, setState] = useState<{
    projectFiles: ProjectFiles[]
    isLoading: boolean
  }>({
    projectFiles: [],
    isLoading: true,
  })

  const {
    files: visitedFiles,
    visitFile,
    isLoading: isLoadingVisitedFiles,
  } = useVisitedFiles()

  useEffect(() => {
    async function fetch() {
      const cachedFiles = await loadFiles()
      if (cachedFiles) {
        setState((oldState) => ({ ...oldState, projectFiles: cachedFiles }))
      }

      const newFiles = await fetchFiles()

      setState((oldState) => ({
        ...oldState,
        projectFiles: newFiles,
        isLoading: false,
      }))

      await storeFiles(newFiles)
    }
    fetch()
  }, [])

  return (
    <List
      isLoading={state.isLoading || isLoadingVisitedFiles}
      searchBarPlaceholder='Filter files by name...'
    >
      {visitedFiles && (
        <List.Section key='recent-files' title='Recent Files'>
          {visitedFiles.map((file) => (
            <FileListItem
              key={file.key + '-recent-file'}
              file={file}
              extraKey={file.key + '-recent-file-item'}
              onVisit={visitFile}
            />
          ))}
        </List.Section>
      )}
      {state.projectFiles.map((project) => (
        <List.Section key={project.name + '-project'} title={project.name}>
          {project.files.map((file) => (
            <FileListItem
              key={file.key + '-file'}
              file={file}
              onVisit={visitFile}
            />
          ))}
        </List.Section>
      ))}
    </List>
  )
}

async function fetchTeamProjects(): Promise<TeamProjects> {
  const { PERSONAL_ACCESS_TOKEN, TEAM_ID } = getPreferenceValues()
  try {
    const response = await fetch(
      `https://api.figma.com/v1/teams/${TEAM_ID}/projects`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Figma-Token': PERSONAL_ACCESS_TOKEN,
        },
      }
    )

    const json = (await response.json()) as TeamProjects
    return json
  } catch (error) {
    console.error(error)
    showToast(ToastStyle.Failure, 'Could not load team')
    return Promise.resolve({ name: 'No team found', projects: [] })
  }
}

async function fetchFiles(): Promise<ProjectFiles[]> {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues()
  const teamProjects = await fetchTeamProjects()
  const projects = teamProjects.projects.map(async (project) => {
    try {
      const response = await fetch(
        `https://api.figma.com/v1/projects/${project.id}/files`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Figma-Token': PERSONAL_ACCESS_TOKEN,
          },
        }
      )

      const json = (await response.json()) as ProjectFiles
      return { name: project.name, files: json.files as File[] }
    } catch (error) {
      console.error(error)
      showToast(ToastStyle.Failure, 'Could not load files')
      return Promise.resolve([])
    }
  })

  return Promise.all(projects) as Promise<ProjectFiles[]>
}
