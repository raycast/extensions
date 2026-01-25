import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
} from "@raycast/api"
import React, { useEffect, useState } from "react"
import { parseCurl } from "../utils/curlParser"
import { RequestBuilder } from "./RequestBuilder"

export const CurlImport: React.FC = () => {
  const { push } = useNavigation()
  const [curlCommand, setCurlCommand] = useState("")
  const [parsedRequest, setParsedRequest] = useState<Awaited<
    ReturnType<typeof parseCurl>
  > | null>(null)

  useEffect(() => {
    // Try to get cURL from clipboard on mount
    Clipboard.readText().then(async (text) => {
      if (text && text.trim().startsWith("curl")) {
        setCurlCommand(text.trim())
        const parsed = await parseCurl(text.trim())
        setParsedRequest(parsed)
      }
    })
  }, [])

  const handleParse = async (formValues: { curlCommand: string }) => {
    const command = formValues.curlCommand.trim()
    if (!command) {
      showToast({
        title: "Empty command",
        message: "Please enter a cURL command",
        style: Toast.Style.Failure,
      })
      return
    }

    try {
      const parsed = await parseCurl(command)
      setParsedRequest(parsed)

      if ("error" in parsed) {
        showToast({
          title: "Parse error",
          message: parsed.error,
          style: Toast.Style.Failure,
        })
        return
      }

      showToast({
        title: "Parsed successfully",
        message: `Found ${parsed.method} request`,
        style: Toast.Style.Success,
      })
    } catch (error) {
      showToast({
        title: "Parse error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to parse cURL command",
        style: Toast.Style.Failure,
      })
    }
  }

  const handleSendRequest = () => {
    if (!parsedRequest || "error" in parsedRequest) {
      showToast({
        title: "Cannot send",
        message: "Please parse a valid cURL command first",
        style: Toast.Style.Failure,
      })
      return
    }

    const { method, url, headers, body } = parsedRequest

    // Extract variables and params from URL
    const variables = url.path?.filter((segment) => segment.match(/{{.*?}}/))
    const params = url.query

    push(
      <RequestBuilder
        name="Imported Request"
        url={url}
        variables={variables}
        params={params}
        header={headers}
        method={method}
        body={body}
      />
    )
  }

  return (
    <Form
      navigationTitle="Import cURL"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Parse cURL"
            icon={Icon.Eye}
            onSubmit={handleParse}
          />
          {parsedRequest && !("error" in parsedRequest) && (
            <Action
              title="Send Request"
              icon={Icon.Upload}
              onAction={handleSendRequest}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="cURL Import"
        text="Paste a cURL command below to import it as a Postman request. The command will be automatically detected from your clipboard if available."
      />
      <Form.TextArea
        id="curlCommand"
        title="cURL Command"
        placeholder={`curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d '{"name":"John"}'`}
        defaultValue={curlCommand}
        info="Enter or paste a cURL command to parse"
      />
      {parsedRequest && !("error" in parsedRequest) && (
        <>
          <Form.Separator />
          <Form.Description title="Parsed Request" text="" />
          <Form.Description text={`Method: ${parsedRequest.method}`} />
          <Form.Description text={`URL: ${parsedRequest.url.raw}`} />
          {parsedRequest.headers && parsedRequest.headers.length > 0 && (
            <Form.Description
              text={`Headers: ${parsedRequest.headers.length} header(s)`}
            />
          )}
          {parsedRequest.body && (
            <Form.Description
              text={`Body: ${parsedRequest.body.mode || "raw"}`}
            />
          )}
        </>
      )}
      {parsedRequest && "error" in parsedRequest && (
        <>
          <Form.Separator />
          <Form.Description title="Error" text={parsedRequest.error} />
        </>
      )}
    </Form>
  )
}
