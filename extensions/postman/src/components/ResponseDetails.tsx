import {
  Action,
  ActionPanel,
  Detail,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api"
import { useEffect, useState } from "react"
import { FormPayloadType, HeaderType, MethodsType, URLType } from "../types"
import fetch from "node-fetch"
import { getMarkdown, prepareFinalURL } from "../utils"

type ResponseDetailsType = {
  url: URLType
  payload?: FormPayloadType
  header?: HeaderType[]
  method?: MethodsType
}

export const ResponseDetails: React.FC<ResponseDetailsType> = ({
  header,
  method,
  url,
  payload,
}) => {
  const [isRequestLoading, setIsRequestLoading] = useState(false)
  const [content, setContent] = useState<string>()

  const sendRequest = async () => {
    const finalURL = prepareFinalURL(url, payload)

    if (!finalURL) {
      showToast({ title: "Couldn't send request.", style: Toast.Style.Failure })
      return
    }

    const headers: Record<string, string> = {}
    header && header.forEach((header) => (headers[header.key] = header.value))

    setIsRequestLoading(true)

    const res = await fetch(finalURL, {
      method,
      headers,
    })
    const json = await res.json()
    json && setContent(getMarkdown(JSON.stringify(json, null, 2)))
    setIsRequestLoading(false)
  }

  useEffect(() => {
    sendRequest()
  }, [url])

  return (
    <Detail
      isLoading={isRequestLoading}
      markdown={`# Response 
${content || "Loading Response..."}`}
      actions={
        content && (
          <ActionPanel>
            <Action.CopyToClipboard
              content={content}
              onCopy={() => popToRoot()}
            />
          </ActionPanel>
        )
      }
    />
  )
}
