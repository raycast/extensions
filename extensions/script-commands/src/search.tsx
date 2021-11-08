import { useState, useEffect } from "react"

import { fetchScriptCommands } from "@network"

import { Group } from "@models"

import { MainContent } from "@components"

interface Result {
  groups: Group[]
  totalScriptCommands: number
}

export default function ScriptCommandsList() {
  const [content, setContent] = useState<Result>({ 
    groups: [],
    totalScriptCommands: 0
  })

  useEffect(() => {
    async function fetch() {
      const main = await fetchScriptCommands()

      setContent((oldState) => ({
        ...oldState,
        groups: main?.groups ?? [],
        totalScriptCommands: main?.totalScriptCommands ?? 0
      }))
    }

    fetch()
  }, [])

  return (
    <MainContent 
      isLoading={content.groups.length == 0} 
      groups={content.groups} 
      totalScriptCommands={content.totalScriptCommands}
  />
  )
}
