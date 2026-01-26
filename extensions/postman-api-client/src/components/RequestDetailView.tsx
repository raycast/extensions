import { Action, ActionPanel, Detail, Icon, showToast, Toast, useNavigation, Clipboard } from "@raycast/api"
import React, { useEffect, useState } from "react"
import { RequestDetailsType, MethodsType } from "../types"
import { RequestBuilder } from "./RequestBuilder"
import { ResponseDetails } from "./ResponseDetails"
import { EnvironmentManager } from "./EnvironmentManager"
import { parseRequest, getURL } from "../utils"
import { generateCurl } from "../utils/curlGenerator"
import { getActiveEnvironment, substituteVariables } from "../utils/environmentStorage"

type RequestDetailViewProps = {
  requestDetails: RequestDetailsType
  collectionId?: string
  collectionName?: string
}

export const RequestDetailView: React.FC<RequestDetailViewProps> = ({ requestDetails, collectionId }) => {
  const { push } = useNavigation()
  const [activeEnvironment, setActiveEnvironment] = useState<string | null>(null)
  const [environmentName, setEnvironmentName] = useState<string>("No Environment")

  useEffect(() => {
    const loadEnvironment = async () => {
      const env = await getActiveEnvironment()
      if (env) {
        setActiveEnvironment(env.id)
        setEnvironmentName(env.name)
      }
    }
    loadEnvironment()
  }, [])

  const urlInfo = parseRequest(requestDetails.request)
  const method = (requestDetails.request.method || "GET") as MethodsType
  const urlObj = getURL(requestDetails.request)
  const url = urlObj?.raw || "N/A"

  // Substitute environment variables in URL for display
  const [displayUrl, setDisplayUrl] = useState(url)
  useEffect(() => {
    const updateUrl = async () => {
      if (activeEnvironment) {
        const env = await getActiveEnvironment()
        if (env) {
          setDisplayUrl(substituteVariables(url, env))
        }
      } else {
        setDisplayUrl(url)
      }
    }
    updateUrl()
  }, [url, activeEnvironment])

  const bodyText = requestDetails.request.body?.raw || ""
  const hasBody = ["POST", "PUT", "PATCH"].includes(method)
  const needsForm = urlInfo?.params || urlInfo?.variables || hasBody

  const handleCopyCurl = async () => {
    try {
      const curl = generateCurl(requestDetails.request)
      await Clipboard.copy(curl)
      showToast({
        title: "Copied to clipboard",
        message: "cURL command copied",
        style: Toast.Style.Success,
      })
    } catch (error) {
      showToast({
        title: "Failed to copy",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    }
  }

  const handleRunRequest = () => {
    if (!urlInfo) {
      showToast({
        title: "Cannot run request",
        message: "Invalid URL",
        style: Toast.Style.Failure,
      })
      return
    }

    if (needsForm) {
      push(
        <RequestBuilder
          url={urlInfo.url}
          params={urlInfo.params}
          variables={urlInfo.variables}
          header={requestDetails.request.header}
          method={method}
          name={requestDetails.name}
          body={requestDetails.request.body}
          collectionId={collectionId}
          requestId={requestDetails.id}
          originalRequest={requestDetails.request}
        />
      )
    } else {
      push(
        <ResponseDetails
          url={urlInfo.url}
          header={requestDetails.request.header}
          method={method}
          name={requestDetails.name}
        />
      )
    }
  }

  const handleEditRequest = () => {
    if (!urlInfo) {
      showToast({
        title: "Cannot edit request",
        message: "Invalid URL",
        style: Toast.Style.Failure,
      })
      return
    }

    push(
      <RequestBuilder
        url={urlInfo.url}
        params={urlInfo.params}
        variables={urlInfo.variables}
        header={requestDetails.request.header}
        method={method}
        name={requestDetails.name}
        body={requestDetails.request.body}
        collectionId={collectionId}
        requestId={requestDetails.id}
        originalRequest={requestDetails.request}
      />
    )
  }

  const markdown = `# ${requestDetails.name}

**Method:** \`${method}\`

**URL:** \`${displayUrl}\`

**Active Environment:** ${environmentName}

${
  requestDetails.request.header && requestDetails.request.header.length > 0
    ? `**Headers:**\n\`\`\`\n${requestDetails.request.header
        .filter((h) => !h.disabled)
        .map((h) => `${h.key}: ${h.value}`)
        .join("\n")}\n\`\`\`\n`
    : ""
}

${hasBody && bodyText ? `**Body:**\n\`\`\`json\n${bodyText}\n\`\`\`\n` : ""}

${
  urlInfo?.params && urlInfo.params.length > 0
    ? `**Query Parameters:**\n${urlInfo.params
        .filter((p) => !p.disabled)
        .map((p) => `- \`${p.key}\`: ${p.value || ""}`)
        .join("\n")}\n`
    : ""
}

${
  urlInfo?.variables && urlInfo.variables.length > 0
    ? `**Path Variables:**\n${urlInfo.variables.map((v) => `- \`${v}\``).join("\n")}\n`
    : ""
}
`

  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Request Name" text={requestDetails.name} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Method" text={method} />
      <Detail.Metadata.Label title="URL" text={displayUrl} />
      <Detail.Metadata.Label title="Active Environment" text={environmentName} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Last Updated" text={new Date().toLocaleString()} />
    </Detail.Metadata>
  )

  return (
    <Detail
      markdown={markdown}
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action
            title="Run Request"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onAction={handleRunRequest}
          />
          <Action
            title="Edit Request"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={handleEditRequest}
          />
          <Action.Push
            title="Change Environment"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            target={
              <EnvironmentManager
                onEnvironmentChange={() => {
                  // Reload environment when returning
                  const loadEnv = async () => {
                    const env = await getActiveEnvironment()
                    if (env) {
                      setActiveEnvironment(env.id)
                      setEnvironmentName(env.name)
                    } else {
                      setActiveEnvironment(null)
                      setEnvironmentName("No Environment")
                    }
                  }
                  loadEnv()
                }}
              />
            }
          />
          <Action
            title="Copy cURL"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={handleCopyCurl}
          />
        </ActionPanel>
      }
    />
  )
}
