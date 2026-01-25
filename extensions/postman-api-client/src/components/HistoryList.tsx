import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api"
import { useEffect, useState } from "react"
import React from "react"
import { HistoryEntry, URLType } from "../types"
import {
  getHistory,
  deleteHistoryEntry,
  clearHistory,
} from "../utils/historyStorage"
import { ResponseDetails } from "./ResponseDetails"
import { RequestBuilder } from "./RequestBuilder"
import { parseRequest } from "../utils"

export const HistoryList: React.FC = () => {
  const { push } = useNavigation()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      const entries = await getHistory()
      setHistory(entries)
    } catch (error) {
      showToast({
        title: "Failed to load history",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteHistoryEntry(id)
      await loadHistory()
      showToast({
        title: "Deleted",
        message: "Request removed from history",
        style: Toast.Style.Success,
      })
    } catch (error) {
      showToast({
        title: "Failed to delete",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    }
  }

  const handleClearAll = async () => {
    try {
      await clearHistory()
      await loadHistory()
      showToast({
        title: "Cleared",
        message: "All history cleared",
        style: Toast.Style.Success,
      })
    } catch (error) {
      showToast({
        title: "Failed to clear",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    }
  }

  const handleRepeatRequest = (entry: HistoryEntry) => {
    // Reconstruct URL from stored URL string
    try {
      const urlObj = new URL(entry.url)
      const url: URLType = {
        raw: entry.url,
        protocol: urlObj.protocol.replace(":", "") as "https" | "http",
        host: urlObj.hostname.split("."),
        path: urlObj.pathname.split("/").filter(Boolean),
        query: Array.from(urlObj.searchParams.entries()).map(
          ([key, value]) => ({
            key,
            value,
            type: "text",
            disabled: false,
          })
        ),
      }

      const urlInfo = parseRequest({
        url,
        method: entry.method,
        header: entry.request.headers,
      })
      const hasBody = ["POST", "PUT", "PATCH"].includes(entry.method)
      const needsForm = urlInfo?.params || urlInfo?.variables || hasBody

      if (needsForm && urlInfo) {
        push(
          <RequestBuilder
            name={entry.name || `${entry.method} ${entry.url}`}
            url={urlInfo.url}
            params={urlInfo.params}
            variables={urlInfo.variables}
            header={entry.request.headers}
            method={entry.method}
            body={entry.request.body}
          />
        )
      } else if (urlInfo) {
        push(
          <ResponseDetails
            url={urlInfo.url}
            header={entry.request.headers}
            method={entry.method}
            name={entry.name}
          />
        )
      }
    } catch (error) {
      showToast({
        title: "Failed to repeat request",
        message: error instanceof Error ? error.message : "Invalid URL",
        style: Toast.Style.Failure,
      })
    }
  }

  const getStatusIcon = (statusCode?: number) => {
    if (!statusCode) return Icon.Circle
    if (statusCode >= 200 && statusCode < 300) {
      return { source: Icon.CheckCircle, tintColor: Color.Green }
    }
    if (statusCode >= 400) {
      return { source: Icon.XMarkCircle, tintColor: Color.Red }
    }
    return { source: Icon.ExclamationMark, tintColor: Color.Orange }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search request history"
      actions={
        <ActionPanel>
          <Action
            title="Refresh History"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={loadHistory}
          />
          {history.length > 0 && (
            <Action
              title="Clear All History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleClearAll}
            />
          )}
        </ActionPanel>
      }
    >
      {history.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No History"
          description="Your executed requests will appear here"
        />
      ) : (
        history.map((entry) => (
          <List.Item
            key={entry.id}
            title={entry.name || `${entry.method} ${entry.url}`}
            subtitle={formatTimestamp(entry.timestamp)}
            icon={getStatusIcon(entry.response.statusCode)}
            accessories={[
              {
                text: entry.method,
                icon: Icon.Document,
              },
              entry.response.statusCode
                ? {
                    text: entry.response.statusCode.toString(),
                    icon: Icon.Info,
                  }
                : {},
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label title="Method" text={entry.method} />
                    <Detail.Metadata.Label title="URL" text={entry.url} />
                    {entry.response.statusCode && (
                      <>
                        <Detail.Metadata.Separator />
                        <Detail.Metadata.Label
                          title="Status Code"
                          text={entry.response.statusCode.toString()}
                        />
                      </>
                    )}
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label
                      title="Executed"
                      text={new Date(entry.timestamp).toLocaleString()}
                    />
                  </Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Repeat Request"
                  icon={Icon.ArrowClockwise}
                  onAction={() => handleRepeatRequest(entry)}
                />
                <Action
                  title="View Response"
                  icon={Icon.Eye}
                  onAction={() => {
                    push(
                      <ResponseDetails
                        url={{ raw: entry.url } as URLType}
                        header={entry.request.headers}
                        method={entry.method}
                        name={entry.name}
                      />
                    )
                  }}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => handleDelete(entry.id)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  )
}
