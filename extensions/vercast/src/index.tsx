import {
  render,
  ActionPanel,
  Color,
  Icon,
  List,
  OpenInBrowserAction,
  preferences,
  showToast,
  ToastStyle,
} from '@raycast/api'
import { randomUUID } from 'crypto'
import { useEffect, useState } from 'react'
import useInterval from './use-interval'
import {
  Deployment,
  DeploymentState,
  fetchDeployments,
  fetchTeams,
  fetchUsername,
  Team,
} from './vercel'

render(<Main />)

function Main(): JSX.Element {
  // Get preference values
  const token = String(preferences.token.value)
  if (token.length !== 24) {
    showToast(ToastStyle.Failure, 'Invalid token detected')
    throw new Error('Invalid token length detected')
  }
  const ignoredTeamIDs = String(preferences.ignoredTeams.value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== '')

  // Setup useState objects
  const [username, setUsername] = useState('')
  const [deployments, setDeployments] = useState<Deployment[]>()
  const [teams, setTeams] = useState<Team[]>()
  useEffect(() => {
    const call = async () => setUsername(await fetchUsername())
    if (username === '') {
      call()
    }
  })
  useEffect(() => {
    const call = async () =>
      setDeployments(await fetchDeployments(username, teams ?? []))
    if (!deployments) {
      call()
    }
  })
  useEffect(() => {
    const call = async () => setTeams(await fetchTeams(ignoredTeamIDs))
    if (!teams) {
      call()
    }
  })

  // Refresh deployments every 2 seconds
  useInterval(async () => {
    setDeployments(await fetchDeployments(username, teams ?? []))
  }, 2000)

  return (
    <List isLoading={!deployments}>
      {deployments?.map((d) => {
        let iconSource = Icon.Globe
        let iconTintColor = Color.PrimaryText
        switch (d.state) {
          case DeploymentState.ready:
            iconSource = Icon.Checkmark
            iconTintColor = Color.Green
            break
          case DeploymentState.deploying:
            iconSource = Icon.Hammer
            iconTintColor = Color.Yellow
            break
          case DeploymentState.failed:
            iconSource = Icon.XmarkCircle
            iconTintColor = Color.Red
            break
        }
        const randomID = randomUUID()
        return (
          <List.Item
            key={d.id + randomID}
            id={d.id + randomID}
            title={(d.owner === username ? '' : `${d.owner}/`) + d.project}
            subtitle={d.domain}
            accessoryTitle={d.timeSince}
            icon={{ tintColor: iconTintColor, source: iconSource }}
            actions={
              <ActionPanel>
                <OpenInBrowserAction url={d.url} />
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}
