import { Detail, showToast, Toast } from '@raycast/api'
import { useEffect, useState } from 'react'
import { getDoneToday } from '../services/notion/operations/get-done-today'
import { parseTodosToDoneWorkString } from '../services/notion/utils/parse-to-do-to-done-work-string'
import { Clipboard } from '@raycast/api'

export function DoneWork() {
  const [markdown, setMarkdown] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  const handleCopyDoneWork = async () => {
    setLoading(true)
    const doneWork = await getDoneToday()
    const doneWorkString = parseTodosToDoneWorkString(doneWork)
    const markdown = doneWorkString
      ? `${'## Tasks achieved 🎉'} ${doneWorkString}`
      : '## Nothing for today'
    setMarkdown(markdown)
    await Clipboard.copy(doneWorkString)
    showToast(Toast.Style.Success, 'Copied to clipboard')
    setLoading(false)
  }

  useEffect(() => {
    handleCopyDoneWork()
  }, [])

  return <Detail isLoading={loading} markdown={markdown} />
}
