import { preferences, showToast, ToastStyle } from '@raycast/api'
import fetch, { Headers } from 'node-fetch'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

const headers = new Headers({
  Authorization: 'Bearer ' + preferences.token.value,
})
const apiURL = 'https://api.vercel.com/'

export enum DeploymentState {
  ready,
  failed,
  deploying,
}

export interface Deployment {
  project: string
  state: DeploymentState
  timeSince: string
  rawTime: number
  id: string
  url: string
  domain: string
  owner: string
}

export async function fetchUsername(): Promise<string> {
  try {
    const response = await fetch(apiURL + 'www/user', {
      method: 'get',
      headers: headers,
    })
    const json = await response.json()
    return json.user.username
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to fetch username')
    throw new Error('Failed to fetch username')
  }
}

export async function fetchTeams(
  ignoredTeamIDs: string[]
): Promise<Record<string, string>> {
  const response = await fetch(apiURL + 'v1/teams', {
    method: 'get',
    headers: headers,
  })
  const json = await response.json()
  const teams: Record<string, string> = {}
  for (const team of json.teams) {
    teams[team.id] = team.slug
  }
  if (ignoredTeamIDs.length > 0) {
    for (const ignoredTeamID of ignoredTeamIDs) {
      if (teams[ignoredTeamID]) {
        delete teams[ignoredTeamID]
      }
    }
  }
  return teams
}

export async function fetchDeployments(
  username: string,
  teams: Record<string, string>
): Promise<Deployment[]> {
  dayjs.extend(relativeTime)
  try {
    const deployments: Deployment[] = []
    const teamIDs = Object.keys(teams)
    for (let i = -1; i < teamIDs.length; i++) {
      console.log(teams[teamIDs[i]])
      const response = await fetch(
        apiURL + `v8/projects${i === -1 ? '' : '?teamId=' + teams[teamIDs[i]]}`,
        {
          method: 'get',
          headers: headers,
        }
      )
      const json = await response.json()
      for (const project of json.projects) {
        for (const deployment of project.latestDeployments) {
          if (deployment.creator.username === username) {
            let state: DeploymentState
            switch (deployment.readyState.toUpperCase()) {
              case 'READY':
                state = DeploymentState.ready
                break
              case 'BUILDING':
              case 'QUEUED':
                state = DeploymentState.deploying
                break
              default:
                state = DeploymentState.failed
                break
            }
            const owner = i === -1 ? username : teams[teamIDs[i]]
            deployments.push({
              project: project.name,
              state: state,
              timeSince: dayjs(deployment.createdAt).fromNow(),
              id: deployment.id,
              url: `https://vercel.com/${owner}/${
                project.name
              }/${deployment.id.replace('dpl_', '')}`,
              domain: deployment.alias[0],
              owner,
              rawTime: deployment.createdAt,
            })
            break
          }
        }
      }
    }

    return deployments.sort((a, b) => b.rawTime - a.rawTime)
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to fetch deployments')
    throw new Error('Failed to fetch deployments')
  }
}
