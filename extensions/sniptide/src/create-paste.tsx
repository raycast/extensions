import { randomUUID } from "node:crypto"
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getSelectedText,
  Icon,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api"
import { useCachedPromise, useForm, usePromise } from "@raycast/utils"
import type { Visibility } from "@sniptide/sdk"
import { client, defaultVisibility } from "./api"
import { captureFromText, fileNameFor, validFileName } from "./lib/capture"
import { messages } from "./lib/messages"
import { report } from "./report"

interface Values {
  content: string
  title: string
  fileName: string
  visibility: string
  collection: string
}

// What the reader most likely means to save: the selection in the app they came from, or else the
// clipboard's text.
async function startingText() {
  try {
    const selected = await getSelectedText()
    if (selected.trim()) return selected
  } catch {
    // Raycast throws when the frontmost app has no selection or doesn't expose one.
  }
  return (await Clipboard.readText()) ?? ""
}

export default function CreatePaste() {
  const { data, isLoading } = usePromise(startingText)
  // The form reads its starting values once, so it waits for the text.
  if (isLoading || data === undefined) return <Form isLoading />
  return <CreateForm content={data} />
}

function CreateForm({ content }: { content: string }) {
  const { data: collections } = useCachedPromise(
    async () => (await client().listCollections()).collections,
    [],
    // Without the list the paste can still be created outside a collection.
    { onError: () => {} },
  )

  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: {
      content,
      title: "",
      fileName: fileNameFor(content),
      visibility: defaultVisibility(),
      collection: "",
    },
    validation: {
      content: (value) => (value?.trim() ? undefined : messages.contentRequired),
      fileName: (value) => (validFileName(value ?? "") ? undefined : messages.fileNameInvalid),
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: messages.creating })
      try {
        const { paste } = await client().createPaste(
          captureFromText(values.content, {
            title: values.title,
            fileName: values.fileName,
            visibility: values.visibility as Visibility,
            collection: values.collection || null,
          }),
          randomUUID(),
        )
        await Clipboard.copy(paste.url)
        await toast.hide()
        await showHUD(messages.linkCopied)
        await popToRoot()
      } catch (error) {
        await report(error, messages.createFailed)
      }
    },
  })

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Link}
            title={messages.createAndCopy}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.content}
        title={messages.contentLabel}
        placeholder={messages.contentPlaceholder}
      />
      <Form.TextField
        {...itemProps.title}
        title={messages.titleLabel}
        placeholder={messages.titlePlaceholder}
      />
      <Form.TextField
        {...itemProps.fileName}
        title={messages.fileNameLabel}
        info={messages.fileNameInfo}
      />
      <Form.Dropdown {...itemProps.visibility} title={messages.visibilityLabel}>
        <Form.Dropdown.Item value="unlisted" title={messages.unlisted} icon={Icon.Link} />
        <Form.Dropdown.Item value="private" title={messages.private} icon={Icon.Lock} />
        <Form.Dropdown.Item value="public" title={messages.public} icon={Icon.Globe} />
      </Form.Dropdown>
      <Form.Dropdown {...itemProps.collection} title={messages.collectionLabel}>
        <Form.Dropdown.Item value="" title={messages.noCollection} />
        {collections?.map((collection) => (
          <Form.Dropdown.Item
            key={collection.slug}
            value={collection.slug}
            title={collection.name}
            icon={Icon.Folder}
          />
        ))}
      </Form.Dropdown>
    </Form>
  )
}
