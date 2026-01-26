import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api"
import { useEffect, useState } from "react"
import React from "react"
import { FormPayloadType, HeaderType, MethodsType, URLType, BodyType, RequestType } from "../types"
import fetch from "node-fetch"
import { prepareFinalURL } from "../utils"
import { saveHistoryEntry, getHistory, deleteHistoryEntry } from "../utils/historyStorage"
import { getActiveEnvironment, substituteVariables } from "../utils/environmentStorage"
import { generateCurl } from "../utils/curlGenerator"
import { useFetch } from "../fetch/useFetch"
import { CollectionsResponseType } from "../types"
import { createRequest } from "../fetch/useCreateRequest"
import { createCollection } from "../fetch/useCreateCollection"
import { buildCompleteUrl, ensureCompleteUrl } from "../utils/urlBuilder"

const generateCurlFromResponse = (
  url: string,
  method?: MethodsType,
  headers?: HeaderType[],
  body?: BodyType
): string => {
  const request: RequestType = {
    method: method || "GET",
    url: { raw: url },
    header: headers,
    body: body,
  }
  return generateCurl(request)
}

type ResponseDetailsType = {
  url: URLType
  payload?: FormPayloadType
  header?: HeaderType[]
  method?: MethodsType
  body?: BodyType
  name?: string
  originalRequest?: RequestType
  canSave?: boolean
}

export const ResponseDetails: React.FC<ResponseDetailsType> = ({
  header,
  method,
  url,
  payload,
  body,
  name,
  originalRequest,
  canSave = false,
}) => {
  const { data: collectionsData } = useFetch("listCollections")
  const collections = (collectionsData as CollectionsResponseType)?.collections || []
  const [isRequestLoading, setIsRequestLoading] = useState(false)
  const [content, setContent] = useState<string>()
  const [statusCode, setStatusCode] = useState<number>()
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>()
  const [finalURL, setFinalURL] = useState<string>()

  const sendRequest = async () => {
    const urlString = await prepareFinalURL(url, payload)

    if (!urlString) {
      showToast({ title: "Couldn't send request.", style: Toast.Style.Failure })
      return
    }

    setFinalURL(urlString)

    // Get active environment for variable substitution
    const environment = await getActiveEnvironment()

    const headers: Record<string, string> = {}
    header &&
      header
        .filter((h) => !h.disabled)
        .forEach((headerItem) => {
          let headerValue = headerItem.value
          // Substitute environment variables in header values
          if (environment) {
            headerValue = substituteVariables(headerValue, environment)
          }
          headers[headerItem.key] = headerValue
        })

    const httpMethod = method || "GET"
    const hasBody = ["POST", "PUT", "PATCH"].includes(httpMethod)

    let requestBody: string | URLSearchParams | undefined
    let contentType: string | undefined

    if (hasBody) {
      if (body?.mode === "raw" && payload?.body) {
        requestBody = payload.body as string
        contentType = body.options?.raw?.language === "json" ? "application/json" : "text/plain"
      } else if (body?.mode === "urlencoded" && body.urlencoded) {
        const urlencoded = new URLSearchParams()
        body.urlencoded.forEach((item) => {
          const key = `body_${item.key}`
          if (payload?.[key] && !item.disabled) {
            urlencoded.append(item.key, payload[key] as string)
          } else if (item.value && !item.disabled) {
            urlencoded.append(item.key, item.value)
          }
        })
        requestBody = urlencoded
        contentType = "application/x-www-form-urlencoded"
      } else if (body?.mode === "formdata" && body.formdata) {
        // For form-data, convert to URLSearchParams for Phase 1
        // Full FormData support can be added later with formdata-node package
        const formData = new URLSearchParams()
        body.formdata.forEach((item) => {
          const key = `body_${item.key}`
          if (payload?.[key] && !item.disabled) {
            formData.append(item.key, payload[key] as string)
          } else if (item.value && !item.disabled) {
            formData.append(item.key, item.value)
          }
        })
        requestBody = formData
        contentType = "application/x-www-form-urlencoded"
      } else if (payload?.body) {
        requestBody = payload.body as string
        contentType = "application/json"
      }

      if (contentType && !headers["Content-Type"]) {
        headers["Content-Type"] = contentType
      }
    }

    setIsRequestLoading(true)

    try {
      const fetchOptions: {
        method: string
        headers: Record<string, string>
        body?: string
      } = {
        method: httpMethod,
        headers,
      }

      if (requestBody) {
        if (requestBody instanceof URLSearchParams) {
          fetchOptions.body = requestBody.toString()
        } else {
          fetchOptions.body = requestBody
        }
      }

      const res = await fetch(urlString, fetchOptions)
      setStatusCode(res.status)

      const responseHeadersObj: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeadersObj[key] = value
      })
      setResponseHeaders(responseHeadersObj)

      const contentTypeHeader = res.headers.get("content-type") || ""
      let responseText: string
      let isBinary = false

      // Check if response is binary
      const binaryTypes = ["image/", "application/pdf", "application/octet-stream", "video/", "audio/"]
      isBinary = binaryTypes.some((type) => contentTypeHeader.includes(type))

      if (isBinary) {
        // For binary responses, show info message
        const buffer = await res.arrayBuffer()
        const size = buffer.byteLength
        responseText = `[Binary Response]\n\nContent-Type: ${contentTypeHeader}\nSize: ${(size / 1024).toFixed(
          2
        )} KB\n\nBinary content cannot be displayed as text.`
      } else if (contentTypeHeader.includes("application/json")) {
        try {
          const json = await res.json()
          responseText = JSON.stringify(json, null, 2)
        } catch (error) {
          responseText = await res.text()
        }
      } else {
        responseText = await res.text()
      }

      setContent(responseText)

      // Save to history after request (even if it failed)
      // Use res.status directly since statusCode state might not be updated yet
      const responseStatus = res.status
      if (urlString) {
        try {
          await saveHistoryEntry({
            name: name || `${httpMethod} ${urlString}`,
            method: httpMethod,
            url: urlString,
            request: {
              headers: header?.filter((h) => !h.disabled),
              body: body,
              payload: payload,
            },
            response: {
              statusCode: responseStatus,
              headers: responseHeadersObj,
              body: responseText,
            },
          })
        } catch (historyError) {
          // Silently fail history save - don't interrupt user experience
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      setContent(`Error: ${errorMessage}`)
      showToast({
        title: "Request failed",
        message: errorMessage,
        style: Toast.Style.Failure,
      })
    } finally {
      setIsRequestLoading(false)
    }
  }

  useEffect(() => {
    sendRequest()
  }, [url])

  const statusEmoji = statusCode ? (statusCode >= 200 && statusCode < 300 ? "✅" : statusCode >= 400 ? "❌" : "⚠️") : ""

  const handleSaveToCollection = async (formValues: { collectionId: string; requestName: string }) => {
    let requestToSave: RequestType

    if (originalRequest) {
      // Ensure the original request has a complete URL structure
      if (originalRequest.url) {
        requestToSave = {
          ...originalRequest,
          url: buildCompleteUrl(originalRequest.url),
        }
      } else {
        requestToSave = originalRequest
      }
    } else {
      // Build request from current props
      // Ensure URL has raw field
      if (!url) {
        showToast({
          title: "Invalid URL",
          message: "URL is required and must be valid",
          style: Toast.Style.Failure,
        })
        return
      }

      // Build complete URL structure
      const completeUrl = buildCompleteUrl(url)

      // If we still don't have a raw URL, try to use finalURL
      if (!completeUrl.raw && finalURL) {
        const urlFromFinal = ensureCompleteUrl(finalURL)
        requestToSave = {
          method: method || "GET",
          url: urlFromFinal,
          header: header,
          body: body,
        }
      } else {
        requestToSave = {
          method: method || "GET",
          url: completeUrl,
          header: header,
          body: body,
        }
      }
    }

    // Validate request before saving - ensure raw URL exists
    if (!requestToSave.url) {
      showToast({
        title: "Invalid Request",
        message: "Request URL is missing",
        style: Toast.Style.Failure,
      })
      return
    }

    // Ensure URL has raw field
    const finalUrl = buildCompleteUrl(requestToSave.url)
    if (!finalUrl.raw) {
      showToast({
        title: "Invalid Request",
        message: "Request URL is missing or invalid",
        style: Toast.Style.Failure,
      })
      return
    }

    // Update request with complete URL
    requestToSave = {
      ...requestToSave,
      url: finalUrl,
    }

    const savedRequestName = formValues.requestName || name || "Untitled Request"

    try {
      const result = await createRequest(formValues.collectionId, savedRequestName, requestToSave)

      if (result.success) {
        // Update history entry with the saved request name
        if (finalURL && statusCode) {
          try {
            // Find the most recent history entry for this URL and method
            const history = await getHistory()
            // Find entries matching this request (by URL and method)
            const matchingEntries = history.filter(
              (entry) => entry.url === finalURL && entry.method === (method || "GET")
            )

            if (matchingEntries.length > 0) {
              // Update the most recent matching entry (first one in array)
              const entryToUpdate = matchingEntries[0]
              await deleteHistoryEntry(entryToUpdate.id)
              await saveHistoryEntry({
                name: savedRequestName,
                method: entryToUpdate.method,
                url: entryToUpdate.url,
                request: entryToUpdate.request,
                response: entryToUpdate.response,
              })
            }
          } catch (historyError) {
            // Silently fail history update - don't interrupt user experience
            console.error("Failed to update history:", historyError)
          }
        }

        showToast({
          title: "Saved",
          message: `Request "${savedRequestName}" saved to collection`,
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

  const isBinaryResponse = content?.includes("[Binary Response]")
  const contentTypeHeader = responseHeaders?.["content-type"] || responseHeaders?.["Content-Type"] || ""

  const markdown = `# Response ${statusEmoji}

${statusCode ? `**Status Code:** ${statusCode}` : ""}

${responseHeaders ? `**Headers:**\n\`\`\`json\n${JSON.stringify(responseHeaders, null, 2)}\n\`\`\`\n` : ""}

${isBinaryResponse && contentTypeHeader.includes("image/") ? `**Preview:**\n![Response](${finalURL})\n\n` : ""}

**Body:**
\`\`\`
${content || "Loading Response..."}
\`\`\`
`

  return (
    <Detail
      isLoading={isRequestLoading}
      markdown={markdown}
      actions={
        content ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Response"
              content={content}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onCopy={() => {
                showToast({
                  title: "Copied",
                  message: "Response copied to clipboard",
                  style: Toast.Style.Success,
                })
              }}
            />
            {finalURL && (
              <Action.CopyToClipboard
                title="Copy cURL"
                content={generateCurlFromResponse(finalURL, method, header, body)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onCopy={() => {
                  showToast({
                    title: "Copied",
                    message: "cURL command copied to clipboard",
                    style: Toast.Style.Success,
                  })
                }}
              />
            )}
            {canSave && (
              <Action.Push
                target={<SaveToCollectionForm collections={collections} onSave={handleSaveToCollection} />}
                title="Save to Collection"
                icon={Icon.SaveDocument}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            )}
          </ActionPanel>
        ) : undefined
      }
    />
  )
}

type SaveToCollectionFormProps = {
  collections: Array<{ id: string; name: string }>
  onSave: (values: { collectionId: string; requestName: string }) => Promise<void>
}

const SaveToCollectionForm: React.FC<SaveToCollectionFormProps> = ({ collections, onSave }) => {
  const { pop } = useNavigation()
  const [isSaving, setIsSaving] = useState(false)
  const [createNewCollection, setCreateNewCollection] = useState(false)

  const handleSubmit = async (formValues: {
    collectionId?: string
    requestName: string
    newCollectionName?: string
    newCollectionDescription?: string
  }) => {
    setIsSaving(true)
    try {
      let collectionId = formValues.collectionId

      // If creating a new collection, create it first
      if (createNewCollection && formValues.newCollectionName) {
        const createResult = await createCollection(formValues.newCollectionName, formValues.newCollectionDescription)

        if (!createResult.success) {
          showToast({
            title: "Failed to create collection",
            message: createResult.error || "Unknown error",
            style: Toast.Style.Failure,
          })
          setIsSaving(false)
          return
        }

        collectionId = createResult.collectionId
        if (!collectionId) {
          showToast({
            title: "Failed to create collection",
            message: "Collection was created but ID is missing",
            style: Toast.Style.Failure,
          })
          setIsSaving(false)
          return
        }
      }

      if (!collectionId) {
        showToast({
          title: "Collection required",
          message: "Please select or create a collection",
          style: Toast.Style.Failure,
        })
        setIsSaving(false)
        return
      }

      await onSave({
        collectionId: collectionId,
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
          <Action.SubmitForm
            title={createNewCollection ? "Create Collection & Save Request" : "Save Request"}
            icon={Icon.SaveDocument}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="createNewCollection"
        label="Create New Collection"
        defaultValue={createNewCollection}
        onChange={setCreateNewCollection}
      />

      {createNewCollection ? (
        <>
          <Form.TextField
            id="newCollectionName"
            title="Collection Name"
            placeholder="e.g., My API Collection"
            info="Enter a name for the new collection"
          />
          <Form.TextArea
            id="newCollectionDescription"
            title="Description (Optional)"
            placeholder="Describe what this collection is for"
            info="Optional description for the collection"
          />
          <Form.Separator />
        </>
      ) : (
        <>
          {collections.length > 0 ? (
            <Form.Dropdown id="collectionId" title="Collection" defaultValue={collections[0]?.id}>
              {collections.map((collection) => (
                <Form.Dropdown.Item key={collection.id} value={collection.id} title={collection.name} />
              ))}
            </Form.Dropdown>
          ) : (
            <Form.Description
              title="No Collections Available"
              text="Toggle 'Create New Collection' above to create a new collection, or create one in Postman first."
            />
          )}
        </>
      )}

      <Form.Separator />
      <Form.TextField
        id="requestName"
        title="Request Name"
        placeholder="e.g., Get User, Create Post"
        defaultValue="Untitled Request"
        info="Name for the request that will be saved"
      />
    </Form>
  )
}
