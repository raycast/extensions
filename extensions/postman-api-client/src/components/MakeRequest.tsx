import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation, Clipboard } from "@raycast/api"
import React, { useEffect, useState } from "react"
import { parseCurl } from "../utils/curlParser"
import { MethodsType, HeaderType, URLType, BodyType, RequestType } from "../types"
import { ResponseDetails } from "./ResponseDetails"
import { RequestBuilder } from "./RequestBuilder"
import { parseRequest } from "../utils"
import { useFetch } from "../fetch/useFetch"
import { CollectionsResponseType } from "../types"
import { createRequest } from "../fetch/useCreateRequest"
import { buildCompleteUrl } from "../utils/urlBuilder"

export const MakeRequest: React.FC = () => {
  const { push } = useNavigation()
  const [curlCommand, setCurlCommand] = useState("")
  const [method, setMethod] = useState<MethodsType>("GET")
  const [url, setUrl] = useState("")
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([{ key: "", value: "" }])
  const [body, setBody] = useState("")

  // Load collections for save workflow
  const { data: collectionsData } = useFetch("listCollections")
  const collections = (collectionsData as CollectionsResponseType)?.collections || []

  useEffect(() => {
    // Try to get cURL from clipboard on mount
    Clipboard.readText().then(async (text) => {
      if (text && text.trim().startsWith("curl")) {
        setCurlCommand(text.trim())
        await handleParseCurl(text.trim())
      }
    })
  }, [])

  const handleParseCurl = async (command: string) => {
    if (!command.trim()) {
      showToast({
        title: "Empty command",
        message: "Please enter a cURL command",
        style: Toast.Style.Failure,
      })
      return
    }

    if (!command.trim().startsWith("curl")) {
      showToast({
        title: "Invalid command",
        message: "Please enter a valid cURL command",
        style: Toast.Style.Failure,
      })
      return
    }

    try {
      const parsed = await parseCurl(command.trim())
      if ("error" in parsed) {
        showToast({
          title: "Parse error",
          message: parsed.error,
          style: Toast.Style.Failure,
        })
        return
      }

      // Set method
      setMethod(parsed.method)

      // Set URL - use the raw URL string
      const urlString = parsed.url.raw || ""
      if (!urlString) {
        showToast({
          title: "Parse error",
          message: "No URL found in cURL command",
          style: Toast.Style.Failure,
        })
        return
      }
      setUrl(urlString)

      // Set headers
      if (parsed.headers && parsed.headers.length > 0) {
        setHeaders(parsed.headers.map((h) => ({ key: h.key, value: h.value })))
      } else {
        setHeaders([{ key: "", value: "" }])
      }

      // Set body - handle different body types
      if (parsed.body) {
        if (parsed.body.mode === "raw" && parsed.body.raw) {
          setBody(parsed.body.raw)
        } else if (parsed.body.mode === "urlencoded" && parsed.body.urlencoded) {
          // Convert urlencoded to raw string for display
          const urlencodedString = parsed.body.urlencoded.map((item) => `${item.key}=${item.value || ""}`).join("&")
          setBody(urlencodedString)
        } else if (parsed.body.mode === "formdata" && parsed.body.formdata) {
          // Convert formdata to raw string for display
          const formdataString = parsed.body.formdata.map((item) => `${item.key}=${item.value || ""}`).join("&")
          setBody(formdataString)
        } else {
          setBody("")
        }
      } else {
        setBody("")
      }

      showToast({
        title: "Parsed successfully",
        message: `Found ${parsed.method} request to ${urlString}`,
        style: Toast.Style.Success,
      })
    } catch (error) {
      showToast({
        title: "Parse error",
        message: error instanceof Error ? error.message : "Failed to parse cURL command",
        style: Toast.Style.Failure,
      })
    }
  }

  const handleCurlBlur = async (value: string) => {
    if (value.trim() && value.trim().startsWith("curl")) {
      await handleParseCurl(value.trim())
    }
  }

  const buildRequest = (): RequestType | null => {
    if (!url.trim()) {
      showToast({
        title: "URL required",
        message: "Please enter a URL",
        style: Toast.Style.Failure,
      })
      return null
    }

    try {
      // Ensure URL has a protocol
      let urlToParse = url.trim()
      if (!urlToParse.match(/^https?:\/\//i)) {
        urlToParse = `https://${urlToParse}`
      }

      const urlObj = new URL(urlToParse)

      // Use the original URL if it was valid, otherwise use the parsed one
      const finalUrl = url.match(/^https?:\/\//i) ? url : urlToParse

      const urlType: URLType = {
        raw: finalUrl,
        protocol: urlObj.protocol.replace(":", "") as "https" | "http",
        host: urlObj.hostname.split("."),
        path: urlObj.pathname.split("/").filter((p) => p),
        query: Array.from(urlObj.searchParams.entries()).map(([key, value]) => ({
          key,
          value,
          type: "text",
          disabled: false,
        })),
      }

      // Ensure raw URL is set
      if (!urlType.raw) {
        urlType.raw = finalUrl
      }

      const headerList: HeaderType[] = headers
        .filter((h) => h.key.trim() && h.value.trim())
        .map((h) => ({
          key: h.key.trim(),
          value: h.value.trim(),
          type: "text",
          disabled: false,
        }))

      let bodyType: BodyType | undefined
      if (["POST", "PUT", "PATCH"].includes(method) && body.trim()) {
        bodyType = {
          mode: "raw",
          raw: body.trim(),
          options: {
            raw: {
              language: "json",
            },
          },
        }
      }

      // Ensure URL has complete structure with raw field
      const completeUrl = buildCompleteUrl(urlType)

      return {
        method,
        url: completeUrl,
        header: headerList.length > 0 ? headerList : undefined,
        body: bodyType,
      }
    } catch (error) {
      showToast({
        title: "Invalid URL",
        message: "Please enter a valid URL",
        style: Toast.Style.Failure,
      })
      return null
    }
  }

  const handleRunRequest = async () => {
    const request = buildRequest()
    if (!request) return

    try {
      const urlInfo = parseRequest(request)
      if (!urlInfo) {
        showToast({
          title: "Invalid request",
          message: "Could not parse request",
          style: Toast.Style.Failure,
        })
        return
      }

      const hasBody = ["POST", "PUT", "PATCH"].includes(method)
      const needsForm = urlInfo.params || urlInfo.variables || hasBody

      if (needsForm) {
        push(
          <RequestBuilder
            name="Scratchpad Request"
            url={urlInfo.url}
            params={urlInfo.params}
            variables={urlInfo.variables}
            header={request.header}
            method={method}
            body={request.body}
            originalRequest={request}
            canSave={true}
          />
        )
      } else {
        push(
          <ResponseDetails
            url={urlInfo.url}
            header={request.header}
            method={method}
            name="Scratchpad Request"
            originalRequest={request}
            canSave={true}
          />
        )
      }
    } catch (error) {
      showToast({
        title: "Failed to run request",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    }
  }

  const handleSaveToCollection = async (formValues: {
    collectionId: string
    folderId?: string
    requestName: string
  }) => {
    const request = buildRequest()
    if (!request) {
      showToast({
        title: "Cannot save",
        message: "Invalid request. Please check the URL and try again.",
        style: Toast.Style.Failure,
      })
      return
    }

    // Validate URL has raw field
    if (!request.url || !request.url.raw) {
      showToast({
        title: "Invalid URL",
        message: "URL is required and must be valid",
        style: Toast.Style.Failure,
      })
      return
    }

    try {
      const result = await createRequest(formValues.collectionId, formValues.requestName || "Untitled Request", request)

      if (result.success) {
        showToast({
          title: "Saved",
          message: "Request saved to collection",
          style: Toast.Style.Success,
        })
      } else {
        showToast({
          title: "Failed to save",
          message: result.error || "Unknown error",
          style: Toast.Style.Failure,
        })
      }
    } catch (error) {
      showToast({
        title: "Failed to save",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    }
  }

  return (
    <Form
      navigationTitle="Make Request"
      actions={
        <ActionPanel>
          <Action
            title="Parse cURL"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onAction={() => handleParseCurl(curlCommand)}
          />
          <Action
            title="Run Request"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={handleRunRequest}
          />
          {collections.length > 0 && (
            <Action.Push
              target={<SaveToCollectionForm collections={collections} onSave={handleSaveToCollection} />}
              title="Save to Collection"
              icon={Icon.SaveDocument}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="Import cURL" text="Paste a cURL command to auto-fill the form below" />
      <Form.TextArea
        id="curlCommand"
        title="cURL Command"
        placeholder={`curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d '{"name":"John"}'`}
        value={curlCommand}
        onChange={setCurlCommand}
        onBlur={(e) => handleCurlBlur(e.target.value || curlCommand)}
        info="Paste a cURL command here and it will auto-fill the form below"
      />

      <Form.Separator />

      <Form.Dropdown id="method" title="Method" value={method} onChange={(value) => setMethod(value as MethodsType)}>
        <Form.Dropdown.Item value="GET" title="GET" />
        <Form.Dropdown.Item value="POST" title="POST" />
        <Form.Dropdown.Item value="PUT" title="PUT" />
        <Form.Dropdown.Item value="PATCH" title="PATCH" />
        <Form.Dropdown.Item value="DELETE" title="DELETE" />
        <Form.Dropdown.Item value="HEAD" title="HEAD" />
        <Form.Dropdown.Item value="OPTIONS" title="OPTIONS" />
      </Form.Dropdown>

      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://api.example.com/users"
        value={url}
        onChange={setUrl}
        info="Enter the full URL. Use {{variable}} for environment variables"
      />

      <Form.Separator />
      <Form.Description title="Headers" text="Add HTTP headers" />
      {headers.map((header, index) => (
        <React.Fragment key={index}>
          <Form.TextField
            id={`header_key_${index}`}
            title="Header Name"
            placeholder="Content-Type"
            value={header.key}
            onChange={(value) => {
              const newHeaders = [...headers]
              newHeaders[index].key = value
              setHeaders(newHeaders)
            }}
          />
          <Form.TextField
            id={`header_value_${index}`}
            title="Value"
            placeholder="application/json"
            value={header.value}
            onChange={(value) => {
              const newHeaders = [...headers]
              newHeaders[index].value = value
              setHeaders(newHeaders)
            }}
          />
          {index < headers.length - 1 && <Form.Separator />}
        </React.Fragment>
      ))}
      <Form.Description text={`${headers.length} header(s). Add more by editing this form.`} />

      {["POST", "PUT", "PATCH"].includes(method) && (
        <>
          <Form.Separator />
          <Form.Description title="Request Body" text="Enter the request body (JSON, XML, or plain text)" />
          <Form.TextArea
            id="body"
            title="Body"
            placeholder='{"key": "value"}'
            value={body}
            onChange={setBody}
            info="Enter the request body. JSON will be automatically formatted."
          />
        </>
      )}
    </Form>
  )
}

type SaveToCollectionFormProps = {
  collections: Array<{ id: string; name: string }>
  onSave: (values: { collectionId: string; folderId?: string; requestName: string }) => Promise<void>
}

const SaveToCollectionForm: React.FC<SaveToCollectionFormProps> = ({ collections, onSave }) => {
  const { pop } = useNavigation()
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (formValues: { collectionId: string; requestName: string }) => {
    setIsSaving(true)
    try {
      await onSave({
        collectionId: formValues.collectionId,
        requestName: formValues.requestName,
      })
      pop()
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form
      navigationTitle="Save to Collection"
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Request" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="collectionId" title="Collection" defaultValue={collections[0]?.id}>
        {collections.map((collection) => (
          <Form.Dropdown.Item key={collection.id} value={collection.id} title={collection.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="requestName"
        title="Request Name"
        placeholder="e.g., Get User, Create Post"
        defaultValue="Untitled Request"
      />
    </Form>
  )
}
