import { Action, ActionPanel, Form, Icon, useNavigation, showToast, Toast } from "@raycast/api"
import React, { useState } from "react"
import {
  HeaderType,
  MethodsType,
  ParamsType,
  URLType,
  VariablesType,
  BodyType,
  RequestType,
  FormPayloadType,
} from "../types"
import { prettifyPathVariables, prepareFinalURL } from "../utils"
import { ResponseDetails } from "./ResponseDetails"
import { updateRequest } from "../fetch/useUpdateRequest"
import { buildCompleteUrl } from "../utils/urlBuilder"

type RequestBuilderProps = {
  name: string
  url: URLType
  variables: VariablesType | undefined
  params: ParamsType | undefined
  header: HeaderType[] | undefined
  method: MethodsType | undefined
  body?: BodyType
  collectionId?: string
  requestId?: string
  originalRequest?: RequestType
  canSave?: boolean
}

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
  name,
  params,
  variables,
  body,
  collectionId,
  requestId,
  originalRequest,
  canSave: canSaveFromProps,
  ...rest
}) => {
  const { push } = useNavigation()
  const [, setIsSaving] = useState(false)

  const method = rest.method || "GET"
  const hasBody = ["POST", "PUT", "PATCH"].includes(method)
  const bodyMode = body?.mode || "raw"
  const canSave = canSaveFromProps || (collectionId && requestId)

  const buildRequestFromForm = async (formValues: FormPayloadType): Promise<RequestType> => {
    const updatedUrl: URLType = { ...rest.url }

    // Update path variables
    if (variables && updatedUrl.path) {
      updatedUrl.path = updatedUrl.path.map((segment) => {
        if (variables.includes(segment)) {
          const value = formValues[segment] as string
          return value || segment
        }
        return segment
      })
    }

    // Update query parameters
    if (params && updatedUrl.query) {
      updatedUrl.query = params.map((param) => ({
        ...param,
        value: (formValues[param.key] as string) || param.value || "",
        disabled: !formValues[param.key],
      }))
    }

    // Build final URL (now async for environment variable substitution)
    const finalURL = await prepareFinalURL(updatedUrl, formValues)
    if (finalURL) {
      updatedUrl.raw = finalURL
    }

    // Ensure URL has complete structure with raw field
    const completeUrl = buildCompleteUrl(updatedUrl)

    // Build body
    let updatedBody: BodyType | undefined
    if (hasBody) {
      if (bodyMode === "raw" && formValues.body) {
        updatedBody = {
          mode: "raw",
          raw: formValues.body as string,
          options: body?.options,
        }
      } else if (bodyMode === "urlencoded" && body?.urlencoded) {
        updatedBody = {
          mode: "urlencoded",
          urlencoded: body.urlencoded.map((item) => {
            const key = `body_${item.key}`
            return {
              ...item,
              value: (formValues[key] as string) || item.value || "",
              disabled: !formValues[key],
            }
          }),
        }
      } else if (bodyMode === "formdata" && body?.formdata) {
        updatedBody = {
          mode: "formdata",
          formdata: body.formdata.map((item) => {
            const key = `body_${item.key}`
            return {
              ...item,
              value: (formValues[key] as string) || item.value || "",
              disabled: !formValues[key],
            }
          }),
        }
      }
    }

    return {
      method,
      url: completeUrl,
      header: rest.header,
      body: updatedBody,
    }
  }

  const handleSave = async (formValues: FormPayloadType) => {
    if (!canSave || !collectionId || !requestId) {
      showToast({
        title: "Cannot save",
        message: "Collection ID or Request ID missing",
        style: Toast.Style.Failure,
      })
      return
    }

    setIsSaving(true)
    try {
      const updatedRequest = await buildRequestFromForm(formValues)

      // Ensure URL has complete structure with raw field
      if (updatedRequest.url) {
        updatedRequest.url = buildCompleteUrl(updatedRequest.url)
      }

      const result = await updateRequest(collectionId, requestId, {
        request: updatedRequest,
      })

      if (result.success) {
        showToast({
          title: "Request saved",
          message: "Changes have been saved to Postman",
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
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form
      navigationTitle={name + " Form"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Request"
            icon={Icon.Upload}
            onSubmit={(e) => {
              push(
                <ResponseDetails
                  payload={e}
                  body={body}
                  name={name}
                  originalRequest={originalRequest}
                  canSave={!!canSave}
                  {...rest}
                />
              )
            }}
          />
          {canSave && (
            <Action.SubmitForm
              title="Save Request"
              icon={Icon.SaveDocument}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onSubmit={handleSave}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description text="Environment Variables" />
      {variables ? (
        <>
          {variables.map((pathVariable, idx) => (
            <Form.TextField key={idx} id={pathVariable} title={prettifyPathVariables(pathVariable)} />
          ))}
        </>
      ) : (
        <Form.Description text="No environment variables found for this request." />
      )}
      <Form.Separator />
      <Form.Description text="Query Parameters" />
      {params ? (
        <>
          {params.map((param, idx) => (
            <Form.TextField
              key={idx}
              id={param.key}
              title={param.key}
              defaultValue={param.value}
              info={"You can leave this field blank if you don't want to send this param."}
            />
          ))}
        </>
      ) : (
        <Form.Description text="No query parameters found for this request." />
      )}
      {hasBody && (
        <>
          <Form.Separator />
          <Form.Description text="Request Body" />
          {bodyMode === "raw" && (
            <Form.TextArea
              id="body"
              title="Body"
              defaultValue={body?.raw || ""}
              placeholder='{"key": "value"}'
              info="Enter the request body (JSON, XML, or plain text)"
            />
          )}
          {bodyMode === "urlencoded" && body?.urlencoded && (
            <>
              {body.urlencoded.map((item, idx) => (
                <Form.TextField
                  key={idx}
                  id={`body_${item.key}`}
                  title={item.key}
                  defaultValue={item.disabled ? "" : item.value}
                  info={"You can leave this field blank if you don't want to send this field."}
                />
              ))}
            </>
          )}
          {bodyMode === "formdata" && body?.formdata && (
            <>
              {body.formdata.map((item, idx) => (
                <Form.TextField
                  key={idx}
                  id={`body_${item.key}`}
                  title={item.key}
                  defaultValue={item.disabled ? "" : item.value}
                  info={"You can leave this field blank if you don't want to send this field."}
                />
              ))}
            </>
          )}
          {!body && (
            <Form.TextArea
              id="body"
              title="Body"
              placeholder='{"key": "value"}'
              info="Enter the request body (JSON, XML, or plain text)"
            />
          )}
        </>
      )}
    </Form>
  )
}
