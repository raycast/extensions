import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  getSelectedText,
  open,
  popToRoot,
  showToast,
} from "@raycast/api"
import { FormValidation, useCachedState, useForm } from "@raycast/utils"
import { useEffect, useRef } from "react"

import { describeError } from "../lib/api-error"
import {
  CAPTURE_KINDS,
  type CaptureKind,
  DEFAULT_CAPTURE_KIND,
  captureOps,
  isCaptureKind,
} from "../lib/capture"
import { documentUrl, pricingUrl } from "../lib/urls"
import {
  type Connection,
  type World,
  applyContent,
  canEdit,
  createDocument,
} from "../lib/vvd"

export interface CaptureValues {
  worldId: string
  kind: string
  title: string
  body: string
}

const LAST_WORLD_KEY = "vvd.lastWorldId"
const LAST_KIND_KEY = "vvd.captureKind"

/**
 * One form, two homes: the Quick Capture command's root view (drafts on) and a
 * push from a world or search result (the world preset). A capture is two API
 * calls at most — create the document, then fill it with the typed content
 * ops the platform derives from the tool's codec — never a hand-built body.
 */
export function CaptureForm({
  connection,
  worlds,
  initialWorldId,
  draftValues,
  enableDrafts = false,
}: {
  connection: Connection
  worlds: World[]
  initialWorldId?: string
  draftValues?: Partial<CaptureValues>
  enableDrafts?: boolean
}) {
  const editable = worlds.filter(canEdit)
  const [lastWorldId, setLastWorldId] = useCachedState<string>(
    LAST_WORLD_KEY,
    "",
  )
  const [lastKind, setLastKind] = useCachedState<CaptureKind>(
    LAST_KIND_KEY,
    DEFAULT_CAPTURE_KIND,
  )

  const preferredWorld =
    editable.find((w) => w.id === (draftValues?.worldId ?? initialWorldId)) ??
    editable.find((w) => w.id === lastWorldId) ??
    editable[0]

  const { handleSubmit, itemProps, setValue, values } = useForm<CaptureValues>({
    initialValues: {
      worldId: preferredWorld?.id ?? "",
      kind: isCaptureKind(draftValues?.kind) ? draftValues.kind : lastKind,
      title: draftValues?.title ?? "",
      body: draftValues?.body ?? "",
    },
    validation: {
      worldId: FormValidation.Required,
      title: FormValidation.Required,
    },
    async onSubmit(submitted) {
      const world = editable.find((w) => w.id === submitted.worldId)
      const kind: CaptureKind = isCaptureKind(submitted.kind)
        ? submitted.kind
        : DEFAULT_CAPTURE_KIND
      const label =
        CAPTURE_KINDS.find((k) => k.value === kind)?.title ?? "Document"
      if (!world) return
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Creating ${label.toLowerCase()}…`,
      })
      let created: { id: string; name: string } | null = null
      try {
        created = await createDocument(connection, world.id, {
          name: submitted.title.trim(),
          documentType: kind,
        })
        const ops = captureOps(kind, submitted.body)
        if (ops.length > 0)
          await applyContent(connection, world.id, created.id, ops)
      } catch (err) {
        const described = describeError(err)
        toast.style = Toast.Style.Failure
        if (created) {
          // The document exists; only its text is missing. Say so and offer it.
          const url = documentUrl(connection.origin, world.slug, created.id)
          toast.title = `${label} created without its text`
          toast.message = described.message
          toast.primaryAction = {
            title: "Open in vvd",
            onAction: () => void open(url),
          }
          return
        }
        toast.title = described.title
        toast.message = described.message
        if (described.kind === "upgrade") {
          toast.primaryAction = {
            title: "See Plans",
            onAction: () => void open(pricingUrl(connection.origin)),
          }
        }
        return
      }
      const url = documentUrl(connection.origin, world.slug, created.id)
      setLastWorldId(world.id)
      setLastKind(kind)
      toast.style = Toast.Style.Success
      toast.title = `${label} created`
      toast.message = `${created.name} · ${world.name}`
      toast.primaryAction = {
        title: "Open in vvd",
        shortcut: { modifiers: ["cmd"], key: "o" },
        onAction: () => void open(url),
      }
      toast.secondaryAction = {
        title: "Copy Link",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: () => void Clipboard.copy(url),
      }
      await popToRoot({ clearSearchBar: true })
    },
  })

  // Capture what's selected in the frontmost app — once, and only into an
  // empty body, so a draft or a preset is never overwritten.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || draftValues?.body) return
    prefilled.current = true
    let cancelled = false
    getSelectedText()
      .then((selected) => {
        const text = selected.trim()
        if (!cancelled && text) setValue("body", text)
      })
      .catch(() => {
        // Nothing selected, or the frontmost app doesn't expose its selection.
      })
    return () => {
      cancelled = true
    }
  }, [draftValues?.body, setValue])

  if (editable.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="No world you can edit"
          description="Quick Capture writes into a world where you're an editor. Ask for edit access, or create a world of your own."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Vvd" url={connection.origin} />
            </ActionPanel>
          }
        />
      </List>
    )
  }

  const kindOption =
    CAPTURE_KINDS.find((k) => k.value === values.kind) ?? CAPTURE_KINDS[0]!

  return (
    <Form
      enableDrafts={enableDrafts}
      navigationTitle="Quick Capture"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Create ${kindOption.title}`}
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="World" {...itemProps.worldId}>
        {editable.map((w) => (
          <Form.Dropdown.Item
            key={w.id}
            value={w.id}
            title={w.name}
            icon={Icon.Globe}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Kind" {...itemProps.kind}>
        {CAPTURE_KINDS.map((k) => (
          <Form.Dropdown.Item
            key={k.value}
            value={k.value}
            title={k.title}
            icon={k.value === "card" ? Icon.Layers : Icon.Text}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Title"
        placeholder={
          kindOption.value === "card"
            ? "Sir Reginald"
            : "Session 12 — loose ends"
        }
        autoFocus
        {...itemProps.title}
      />
      <Form.TextArea
        title="Body"
        placeholder="Optional. Selected text lands here."
        info={kindOption.bodyHint}
        {...itemProps.body}
      />
    </Form>
  )
}
