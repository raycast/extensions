import {
  ActionPanel,
  List,
  closeMainWindow,
  Icon,
  Action,
  Detail
} from "@raycast/api"
import { existsSync, readJsonSync } from "fs-extra"
import { homedir } from "os"
import React, { useEffect, useState } from "react"
import { Notebook, NotebookFilter, SearchNotebookState } from "./typings"
import { openNotebook } from "./utils"

const dataPath = `${homedir()}/Library/Containers/QReader.MarginStudyMac/Data/Library/MarginNote Extensions/marginnote.extension.raycastenhance/notebooks.json`

const today = new Date()
const [day, month, year] = [
  today.getDate(),
  today.getMonth() + 1,
  today.getFullYear()
]

function fetchData() {
  try {
    if (!existsSync(dataPath)) throw "not found notebooks.json"
    const notebooks = readJsonSync(dataPath, "utf8") as Notebook[]
    return notebooks.sort((m, n) => n.lastVisit - m.lastVisit)
  } catch (error) {
    console.log(error)
  }
}

export default function () {
  const [state, setState] = useState<SearchNotebookState>({
    notebooks: [],
    loading: true
  })

  const [filter, setFileter] = useState<NotebookFilter>("all")

  useEffect(() => {
    setState({
      notebooks: fetchData(),
      loading: false
    })
    setTimeout(() => {
      setState({
        notebooks: fetchData(),
        loading: false
      })
    }, 1000)
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
              today.getDate(),
              today.getMonth() + 1,
              today.getFullYear()
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
      markdown={`# ⚠️ Not found data source from MarginNote\n ## Please install MarginNote v3.7.21 or lastest and "Raycast Enhance" addon.`}
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
