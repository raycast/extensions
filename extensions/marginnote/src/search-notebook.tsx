import {
  ActionPanel,
  List,
  closeMainWindow,
  Icon,
  Action,
  Detail,
  showToast,
  Toast
} from "@raycast/api"
import { existsSync, readJsonSync } from "fs-extra"
import { homedir } from "os"
import React, { useEffect, useState } from "react"
import type { Notebook, NotebookFilter, SearchNotebookState } from "./typings"
import { isMarginNoteInstalled, openNotebook } from "./utils"

const dataPath = `${homedir()}/Library/Containers/QReader.MarginStudyMac/Data/Library/MarginNote Extensions/marginnote.extension.raycastenhance/notebooks.json`

const today = new Date()
const [day, month, year] = [
  today.getDate(),
  today.getMonth() + 1,
  today.getFullYear()
]

export default function () {
  const [state, setState] = useState<SearchNotebookState>({
    notebooks: [],
    loading: true
  })

  const [filter, setFileter] = useState<NotebookFilter>("all")

  async function fetchData() {
    try {
      if (!(await isMarginNoteInstalled())) {
        showToast(Toast.Style.Failure, "Error", "MarginNote 3 is not installed")
        setState({
          notebooks: undefined,
          loading: false
        })
      } else if (!existsSync(dataPath)) {
        showToast(
          Toast.Style.Failure,
          "No Data Source",
          'Please install "Raycast Enhance" and latest MarginNote 3 (^3.7.21). Click to download "Raycast Enhance".               '
        )
        setState({
          notebooks: undefined,
          loading: false
        })
      } else {
        const notebooks = readJsonSync(dataPath, "utf8") as Notebook[]
        setState({
          notebooks: notebooks.sort((m, n) => n.lastVisit - m.lastVisit),
          loading: false
        })
      }
    } catch (error: any) {
      showToast(Toast.Style.Failure, "Error", error.message)
      setState({
        notebooks: undefined,
        loading: false
      })
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return state.notebooks ? (
    <List
      isLoading={state.loading}
      searchBarPlaceholder="Search Notebook in MarginNote"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Notebook Type"
          storeValue={true}
          onChange={k => {
            setFileter(k as NotebookFilter)
          }}
        >
          {[
            ["all", "All"],
            ["mindmap", "MindMap"],
            ["flashcard", "FlashCard"]
          ].map(k => {
            return <List.Dropdown.Item key={k[0]} title={k[1]} value={k[0]} />
          })}
        </List.Dropdown>
      }
    >
      {state.notebooks
        .reduce(
          (acc, cur) => {
            const date = new Date(cur.lastVisit)
            const [d, m, y] = [
              date.getDate(),
              date.getMonth() + 1,
              date.getFullYear()
            ]
            if (y === year && m === month && d === day) {
              acc[0].push(cur)
            } else if (y === year && m === month && d === day - 1) {
              acc[1].push(cur)
            } else if (y === year && m === month) {
              acc[2].push(cur)
            } else if (y === year) {
              acc[3].push(cur)
            } else {
              acc[4].push(cur)
            }
            return acc
          },
          [[], [], [], [], [], []] as [
            Notebook[],
            Notebook[],
            Notebook[],
            Notebook[],
            Notebook[],
            Notebook[]
          ]
        )
        .map((m, i) => {
          const sections = [
            "today",
            "yesterday",
            "this month",
            "this year",
            "older"
          ]
          if (m.length === 0) return null
          return (
            <List.Section key={i} title={sections[i]}>
              {m
                .filter(
                  k =>
                    filter === "all" ||
                    (filter === "mindmap" && k.type === 1) ||
                    (filter === "flashcard" && k.type === 2)
                )
                .map((k, j) => (
                  <List.Item
                    key={i * 100 + j}
                    icon={k.type === 1 ? "mindmap.png" : "flashcard.png"}
                    title={k.title}
                    accessoryTitle={
                      k.type === 1
                        ? "MindMap"
                        : k.type === 2
                        ? "FlashCard"
                        : "Document"
                    }
                    actions={<Actions notebook={k} />}
                  />
                ))}
            </List.Section>
          )
        })}
    </List>
  ) : (
    <NotFound />
  )
}

const Actions: React.FC<{ notebook: Notebook }> = ({ notebook }) => {
  return (
    <ActionPanel title="Actions">
      <Action
        title="Open in MarginNote"
        icon="marginnote.png"
        onAction={async () => {
          await closeMainWindow()
          await openNotebook(notebook.id)
        }}
      />
      <Action.CopyToClipboard
        title="Copy Link"
        icon={Icon.Clipboard}
        content={`marginnote3app://notebook/${notebook.id}`}
      />
      <Action.CopyToClipboard
        title="Copy Link（Markdown Style）"
        icon={Icon.Clipboard}
        shortcut={{
          modifiers: ["cmd", "shift"],
          key: "enter"
        }}
        content={`[${notebook.title}](marginnote3app://notebook/${notebook.id})`}
      />
    </ActionPanel>
  )
}

const NotFound = () => {
  return (
    <Detail
      markdown=""
      actions={
        <ActionPanel title="Actions">
          <Action.OpenInBrowser
            title="Download Raycast Enhance"
            icon={Icon.AppWindow}
            url="https://github.com/marginnoteapp/raycast-enhance/releases/"
          />
        </ActionPanel>
      }
    />
  )
}
