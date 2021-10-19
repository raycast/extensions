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

export interface Team {
  slug: string
  id: string
}

// Fetch the username that belongs to the token given.
// Use for filtering deployments by user and providing links later on
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

// Fetch teams that the user is apart of
export async function fetchTeams(ignoredTeamIDs: string[]): Promise<Team[]> {
  const response = await fetch(apiURL + 'v1/teams', {
    method: 'get',
    headers: headers,
  })
  const json = await response.json()
  const teams: Team[] = []
  for (const team of json.teams) {
    teams.push({ id: team.id, slug: team.slug })
  }
  return teams.filter((t) => !ignoredTeamIDs.includes(t.id))
}

// Fetch deployments for the user and any teams they are apart of
export async function fetchDeployments(
  username: string,
  teams: Team[]
): Promise<Deployment[]> {
  const deployments: Deployment[] = [...(await rawFetchDeployments(username))]
  for (const team of teams) {
    deployments.push(...(await rawFetchDeployments(username, team)))
  }
  return deployments.sort((a, b) => b.rawTime - a.rawTime)
}

// Raw function for fetching deployments
async function rawFetchDeployments(
  username: string,
  team?: Team
): Promise<Deployment[]> {
  dayjs.extend(relativeTime)
  try {
    const deployments: Deployment[] = []
    const response = await fetch(
      apiURL + `v8/projects${team ? '?teamId=' + team.id : ''}`,
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
          const owner = team ? team.slug : username
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

    return deployments
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to fetch deployments')
    throw new Error('Failed to fetch deployments')
  }
}
