import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api"
import React, { useState } from "react"
import { RequestType, MethodsType, URLType } from "../types"
import { createRequest } from "../fetch/useCreateRequest"

type CreateRequestProps = {
  collectionId: string
  collectionName?: string
}

export const CreateRequest: React.FC<CreateRequestProps> = ({ collectionId, collectionName }) => {
  const { pop } = useNavigation()
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (formValues: { name: string; method: MethodsType; url: string }) => {
    if (!formValues.name.trim() || !formValues.url.trim()) {
      showToast({
        title: "Validation error",
        message: "Name and URL are required",
        style: Toast.Style.Failure,
      })
      return
    }

    setIsCreating(true)
    try {
      // Parse URL
      let urlObj: URLType
      try {
        const url = new URL(formValues.url)
        urlObj = {
          raw: formValues.url,
          protocol: url.protocol.replace(":", "") as "https" | "http",
          host: url.hostname.split("."),
          path: url.pathname.split("/").filter(Boolean),
          query: Array.from(url.searchParams.entries()).map(([key, value]) => ({
            key,
            value,
            type: "text",
            disabled: false,
          })),
        }
      } catch (error) {
        showToast({
          title: "Invalid URL",
          message: "Please enter a valid URL",
          style: Toast.Style.Failure,
        })
        setIsCreating(false)
        return
      }

      const request: RequestType = {
        method: formValues.method,
        url: urlObj,
        header: [],
        body: undefined,
      }

      const result = await createRequest(collectionId, formValues.name, request)

      if (result.success) {
        showToast({
          title: "Request created",
          message: "New request has been added to collection",
          style: Toast.Style.Success,
        })
        pop()
        // Optionally navigate to the new request
      } else {
        showToast({
          title: "Failed to create request",
          message: result.error || "Unknown error",
          style: Toast.Style.Failure,
        })
      }
    } catch (error) {
      showToast({
        title: "Failed to create request",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Form
      navigationTitle={`Create Request${collectionName ? ` in ${collectionName}` : ""}`}
      isLoading={isCreating}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Request" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Request Name"
        placeholder="e.g., Get User, Create Post"
        info="Enter a descriptive name for this request"
      />
      <Form.Dropdown id="method" title="HTTP Method" defaultValue="GET">
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
        info="Enter the full URL for this request. You can add variables using {{variable_name}} syntax."
      />
      <Form.Description text="After creating the request, you can edit it to add headers, body, and configure other details." />
    </Form>
  )
}
