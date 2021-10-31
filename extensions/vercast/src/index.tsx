import {
  render,
  ActionPanel,
  SubmitFormAction,
  PushAction,
  Color,
  Icon,
  List,
  Form,
  FormValues,
  OpenInBrowserAction,
  preferences,
  showToast,
  ToastStyle,
  useNavigation,
} from '@raycast/api'
import { randomUUID } from 'crypto'
import { useEffect, useState } from 'react'
import useInterval from './use-interval'
import {
  Deployment,
  DeploymentState,
  fetchDeployments,
  EnvironmentVariable,
  updateEnvironmentVariable,
  fetchEnvironmentVariables,
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

  // Setup useState objects
  const [username, setUsername] = useState('')
  const [deployments, setDeployments] = useState<Deployment[]>()
  const [teams, setTeams] = useState<Team[]>()
  useEffect(() => {
    const ignoredTeamIDs = String(preferences.ignoredTeams.value ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '')
    const fetchData = async () => {
      const [fetchedUsername, fetchedTeams] = await Promise.all([
        fetchUsername(),
        fetchTeams(ignoredTeamIDs),
      ])
      const fetchedDeployments = await fetchDeployments(
        fetchedUsername,
        fetchedTeams
      )
      setUsername(fetchedUsername)
      setTeams(fetchedTeams)
      setDeployments(fetchedDeployments)
    }
    fetchData()
  }, [])

  // Refresh deployments every 2 seconds
  useInterval(async () => {
    if (username && teams) {
      setDeployments(await fetchDeployments(username, teams))
    }
  }, 8000)

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
                <ActionPanel.Section title={(d.owner === username ? '' : `${d.owner}/`) + d.project}>
                  <OpenInBrowserAction url={d.url} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Project Settings">
                  <PushAction 
                    icon={Icon.Gear}
                    title="Environment Variable"                     
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<UpdateEnvironmentVariable
                      projectId={d.project}
                      projectName={(d.owner === username ? '' : `${d.owner}/`) + d.project}
                    />} 
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}


function UpdateEnvironmentVariable(props: { projectId: string, projectName: string }): JSX.Element {
  // Get props values
  const projectId = props.projectId;
  const projectName = props.projectName;

  // Get preference values
  const token = String(preferences.token.value)
  if (token.length !== 24) {
    showToast(ToastStyle.Failure, 'Invalid token detected')
    throw new Error('Invalid token length detected')
  }

  // Setup useState objects
  const [environmentVariables, setEnvironmentVariables] = useState<EnvironmentVariable[]>()

  // On form submit function
  const { pop } = useNavigation();
  async function handleSubmit(values: FormValues) {
    if (!validateForm(values)) {
      return;
    }
    const envConf = JSON.parse(values.env_conf)
    const updatedEnvVariable = await updateEnvironmentVariable(projectId, envConf.envId, envConf.envKey, values.env_value)

    if(!updatedEnvVariable || !updatedEnvVariable.key){
      showToast(ToastStyle.Failure, "Couldn't update variable");
    }else{
      showToast(ToastStyle.Success, updatedEnvVariable.key+" was updated!");
      pop();
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const fetchedEnvironmentVariables = await fetchEnvironmentVariables(
        projectId
      )     
      setEnvironmentVariables(fetchedEnvironmentVariables)
    }
    fetchData()
  }, [projectId])
  return (
    <Form 
      navigationTitle={projectName+" ->  Environment Variables"}
      isLoading={!environmentVariables} 
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Environment Variable">
            <SubmitFormAction 
              title="Update Variable"
              icon={Icon.Pencil}
              onSubmit={handleSubmit}
               />
            </ActionPanel.Section>
        </ActionPanel>
      }>
      <Form.Dropdown 
        id="env_conf" 
        title="Environment Variable">
          {environmentVariables?.map((ev) => {
            const randomID = randomUUID()
            return (
              <Form.Dropdown.Item 
                value={JSON.stringify({envId : ev.id, envKey : ev.key})} 
                title={ev.key} />
            )
          })}
      </Form.Dropdown>
      <Form.TextArea id="env_value" title="New Value" />
    </Form>
  )
}

function validateForm(values: FormValues): boolean {
  if (!values.env_value) {
    showToast(ToastStyle.Failure, "Please set new value");
    return false;
  }
  return true;
}
