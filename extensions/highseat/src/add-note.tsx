import { Action, ActionPanel, Form, LaunchProps, popToRoot, showToast, Toast } from "@raycast/api"
import { withAccessToken } from "@raycast/utils"
import { getSiteIcon, useSelectedSite } from "./components/site-picker"
import { api, APP_URL, highseat } from "./lib/highseat"

interface NoteValues {
  date: Date | null
  text: string
}

function formatDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function AddNote({ arguments: { text } }: LaunchProps<{ arguments: Arguments.AddNote }>) {
  const { sites, site, setSiteId, isLoading } = useSelectedSite()

  async function submit({ date, text: note }: NoteValues) {
    if (!site) return

    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding note" })

    try {
      await api.post("/sites/{site}/notes", {
        path: { site: site.id },
        body: { date: formatDay(date ?? new Date()), text: note },
      })
      toast.style = Toast.Style.Success
      toast.title = "Note added"
      await popToRoot()
    } catch (error) {
      toast.style = Toast.Style.Failure
      toast.title = "Could not add the note"
      toast.message = error instanceof Error ? error.message : String(error)
    }
  }

  if (!isLoading && !site) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Dashboard" url={APP_URL} />
          </ActionPanel>
        }
      >
        <Form.Description title="No sites yet" text="Add a site in the dashboard, then add a note to it." />
      </Form>
    )
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        site && (
          <ActionPanel>
            <Action.SubmitForm title="Add Note" onSubmit={submit} />
          </ActionPanel>
        )
      }
    >
      {/* The sites load after the form opens, so the note goes to the site this dropdown shows. */}
      {site && (
        <Form.Dropdown id="site" title="Site" value={site.id} onChange={setSiteId}>
          {sites.map(row => (
            <Form.Dropdown.Item key={row.id} icon={getSiteIcon(row)} value={row.id} title={row.name} />
          ))}
        </Form.Dropdown>
      )}
      <Form.DatePicker id="date" title="Date" type={Form.DatePicker.Type.Date} defaultValue={new Date()} />
      <Form.TextArea id="text" title="Note" defaultValue={text} placeholder="Launched the new pricing page" />
    </Form>
  )
}

export default withAccessToken(highseat)(AddNote)
