import { useState, useEffect } from "react"

import { fetchScriptCommands } from "@network"

import { Group } from "@models"

import { MainContent } from "@components";

export default function ScriptCommandsList() {
  const [content, setContent] = useState<{ groups: Group[] }>({ groups: [] })

  useEffect(() => {
    async function fetch() {
      const main = await fetchScriptCommands()

      setContent((oldState) => ({
        ...oldState,
        groups: main?.groups ?? [],
      }));
    }

    fetch()
  }, []);

  return <MainContent isLoading={content.groups.length == 0} groups={content.groups} />
}
