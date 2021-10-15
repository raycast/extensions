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
import { useEffect, useState } from 'react'
import useInterval from './use-interval'
import {
  Deployment,
  DeploymentState,
  fetchDeployments,
  fetchUsername,
} from './vercel'

render(<Main />)

function Main(): JSX.Element {
  const token = String(preferences.token.value)
  if (token.length !== 24) {
    showToast(ToastStyle.Failure, 'Invalid token detected')
    throw new Error('Invalid token length detected')
  }

  const [username, setUsername] = useState('')
  const [deployments, setDeployments] = useState<Deployment[]>()

  useEffect(() => {
    const call = async () => setUsername(await fetchUsername())
    if (username === '') {
      call()
    }
  })
  useEffect(() => {
    const call = async () => setDeployments(await fetchDeployments(username))
    if (!deployments) {
      call()
    }
  })

  useInterval(async () => {
    setDeployments(await fetchDeployments(username))
  }, 1000)

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
        return (
          <List.Item
            key={d.id}
            id={d.id}
            title={d.project}
            subtitle={d.domain}
            accessoryTitle={d.time}
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
