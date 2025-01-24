import { CachedQueryClientProvider } from '@/components/CachedQueryClientProvider'
import { Bookmark } from '@/types'
import { trpc } from '@/utils/trpc.util'
import { Form, ActionPanel, Action, popToRoot, showHUD, Toast, showToast } from '@raycast/api'
import { useRef, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

interface FormValues {
  titleField: string
  urlField: string
  descriptionField: string
}

interface Props {
  bookmark: Bookmark
}

function Body({ bookmark }: Props) {
  const nameTextFieldRef = useRef<Form.TextField>(null)
  const [titleError, setTitleError] = useState<string | undefined>(undefined)

  const urlTextFieldRef = useRef<Form.TextField>(null)
  const [urlError, setUrlError] = useState<string | undefined>(undefined)

  const descriptionTextFieldRef = useRef<Form.TextArea>(null)

  const bookmarkUpdate = trpc.bookmark.update.useMutation()
  const bookmarkExists = trpc.bookmark.exists.useMutation()

  const debouncedUrlCheck = useDebounce(async (value: string) => {
    if (bookmark.url === value) {
      setUrlError(undefined)
      return true
    }

    const exists = await bookmarkExists.mutateAsync({ url: value, spaceId: bookmark.spaceId })
    if (exists) {
      setUrlError('Bookmark with this URL already exists')
      return false
    }

    setUrlError(undefined)
    return true
  }, 500)

  const validateUrlField = async (value: string | undefined) => {
    if (!value || value.length === 0) {
      setUrlError('URL is required')
      return false
    }

    return await debouncedUrlCheck(value)
  }

  const validateTitleField = (value: string | undefined) => {
    if (!value || value.length === 0) {
      setTitleError('Title is required')
      return false
    } else {
      setTitleError(undefined)
      return true
    }
  }

  async function handleSubmit(values: FormValues) {
    const titleValid = validateTitleField(values.titleField)
    const urlValid = await validateUrlField(values.urlField)

    if (!titleValid || !urlValid) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Edit Form is invalid',
      })
      return
    }

    await bookmarkUpdate.mutateAsync({
      id: bookmark.id,
      name: values.titleField,
      url: values.urlField,
      description: values.descriptionField,
    })

    showHUD('Bookmark updated')
    popToRoot({ clearSearchBar: true })
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Edit bookmark" />
      <Form.TextField
        id="titleField"
        title="Title"
        info="Title of the bookmark"
        ref={nameTextFieldRef}
        error={titleError}
        onChange={validateTitleField}
        onBlur={(event) => validateTitleField(event.target.value)}
        defaultValue={bookmark.name}
      />
      <Form.TextField
        id="urlField"
        title="URL"
        info="URL of the bookmark"
        ref={urlTextFieldRef}
        error={urlError}
        onChange={validateUrlField}
        onBlur={(event) => validateUrlField(event.target.value)}
        defaultValue={bookmark.url}
      />
      <Form.TextArea
        id="descriptionField"
        title="Description"
        info="Description of the bookmark"
        ref={descriptionTextFieldRef}
        defaultValue={bookmark.description ?? ''}
      />
    </Form>
  )
}

export const EditBookmark = ({ bookmark }: Props) => {
  return (
    <CachedQueryClientProvider>
      <Body bookmark={bookmark} />
    </CachedQueryClientProvider>
  )
}
