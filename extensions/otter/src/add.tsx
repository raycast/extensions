import {
  Form,
  ActionPanel,
  Action,
  getPreferenceValues,
  open,
  showToast,
  Toast,
} from '@raycast/api'
import urlJoin from 'proper-url-join'
import { copy } from './utils/copy'
import { URL } from 'url'
import { useEffect, useState } from 'react'

export default () => {
  const pref = getPreferenceValues()
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    async function getUrl() {
      try {
        const copiedUrl = await copy()
        new URL(copiedUrl)
        setUrl(copiedUrl)
      } catch (err) {
        return
      }
    }
    getUrl()
  }, [])

  async function handleSubmit(values: { url: string }) {
    try {
      const addUrl = urlJoin(pref.otterBasePath, 'new/bookmark', {
        query: {
          bookmarklet: 'true',
          url: values.url,
        },
      })
      new URL(values.url)
      open(addUrl)
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "The URL isn't valid",
        message: 'Try again with a proper url',
      })
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Url" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Bookmark Url"
        placeholder="https://example.com"
        value={url}
        onChange={(value) => setUrl(value)}
      />
    </Form>
  )
}
