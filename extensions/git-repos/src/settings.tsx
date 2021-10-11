import {
  ActionPanel,
  Application,
  Form,
  FormValue,
  getApplications,
  showToast,
  SubmitFormAction,
  ToastStyle
} from "@raycast/api"

import { ReactElement, useEffect, useState } from "react"
import { Cache, CustomAction, loadSettings, saveSettings, Settings } from "./utils"

export default function Main(): ReactElement {
  const [settings, setSettings] = useState<Settings>()

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  function AppSection(props: { action: CustomAction, index: number, applications: Application[] }) {
    const index = props.index
    const applications = props.applications
    const id = props.index + 1
    const appValue = props.action.appBundleId ?? props.action.app
    const appActionTitle = (props.action.title.length > 0) ? props.action.title : `Open in ${props.action.app}`
    const [actionTitle, setActionTitle] = useState<string>(appActionTitle)

    function onChange(newValue: string) {
      const app = applications.find((a) => a.bundleId === newValue)
      if (app && settings) {
        if (settings.customActions[index].appBundleId != app.bundleId ?? app.name) {
          const newTitle = `Open in ${app.name}`
          setActionTitle(newTitle)
          settings.customActions[index].title = newTitle
        }
        settings.customActions[index].appBundleId = app.bundleId ?? app.name
        settings.customActions[index].appPath = app.path
        settings.customActions[index].app = app.name
      }
    }

    function onChangeActionTitle(newValue: string) {
      setActionTitle(newValue)
      if (settings) {
        settings.customActions[index].title = newValue
      }
    }

    return (
      <>
        <Form.Dropdown id={`${id}-app`} title={`Action ${id} App`} defaultValue={appValue} onChange={onChange} >
          {applications.map((app) => (
            <Form.Dropdown.Item
              value={app.bundleId ?? app.name}
              key={app.bundleId ?? app.name}
              title={app.name}
              icon={{ fileIcon: app.path }}
            />
          ))}
        </Form.Dropdown>
        <Form.TextField id={`${id}-title`} title={`Action ${id} Title`} placeholder={"Enter optional title"} value={actionTitle} onChange={onChangeActionTitle} />
      </>
    )
  }

  function CreateForm(props: { settings: Settings }) {
    const [applications, setApplications] = useState<Application[]>([])
    const settings = props.settings

    useEffect(() => {
      getApplications().then(setApplications)
    }, [])

    return (
      <>
        <Form.TextField id="reposDir" title="Directories to Scan" placeholder="Ex. ~/Developer;~/src" defaultValue={settings.reposDir} />
        <Form.Dropdown id="maxDepth" title="Max Scan Depth" defaultValue={settings.maxDepth.toString()}>
          <Form.Dropdown.Item value="2" title="2" />
          <Form.Dropdown.Item value="3" title="3" />
          <Form.Dropdown.Item value="4" title="4" />
          <Form.Dropdown.Item value="5" title="5" />
          <Form.Dropdown.Item value="6" title="6" />
        </Form.Dropdown>
        <Form.Checkbox id="includeSubmodules" title="Include Submodules" label="" defaultValue={settings.includeSubmodules} />
        <Form.Separator />

        <AppSection action={settings.customActions[0]} index={0} applications={applications} />
        <Form.Separator />

        <AppSection action={settings.customActions[1]} index={1} applications={applications} />
        <Form.Separator />

        <AppSection action={settings.customActions[2]} index={2} applications={applications} />
        <Form.Separator />

        <AppSection action={settings.customActions[3]} index={3} applications={applications} />
        <Form.Separator />

        <AppSection action={settings.customActions[4]} index={4} applications={applications} />
      </>
    )
  }

  function save(values: Record<string, FormValue>) {
    if (settings) {
      settings.reposDir = values["reposDir"] as string
      settings.maxDepth = parseInt(values["maxDepth"] as string)
      settings.includeSubmodules = (values["includeSubmodules"] as number === 1) ? true : false
      saveSettings(settings)
      if (settings.reposDir.length === 0) {
        const cache = new Cache()
        cache.clear()
      }
      showToast(ToastStyle.Success, "Settings Saved")
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Save" onSubmit={save} />
        </ActionPanel>
      }
    >
      {settings &&
        <CreateForm settings={settings} />
      }
    </Form>
  )
}
