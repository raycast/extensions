import path from "path"
import fs from "fs"
import util from "util"
import initSqlJs from "sql.js"
import { useEffect, useState } from "react"
import { environment } from "@raycast/api"

const fsReadFile = util.promisify(fs.readFile)

export interface HistoryEntry {
    id: number
    url: string
    title: string
}

export interface ChromeHistorySearch {
    response?: HistoryEntry[]
    error?: string
    isLoading: boolean
}

const userDataDirectoryPath = () => {
    if (!process.env.HOME) {
        throw new Error("$HOME environment variable is not set.")
    }

    return path.join(
        process.env.HOME,
        "Library",
        "Application Support",
        "Google",
        "Chrome"
    )
}

const historyDbPath = (profileName: string) => path.join(
    userDataDirectoryPath(),
    profileName,
    "History"
);

const searchHistory = async (profileName: string, query: string | undefined): Promise<HistoryEntry[]> => {
    const dbPath = historyDbPath(profileName);

    const fileBuffer = await fsReadFile(dbPath)
    const SQL = await initSqlJs({
        locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm")
    })
    const db = new SQL.Database(fileBuffer)

    try {
        const where = query ? "WHERE title LIKE @query" : ""
        const results = db.exec(
            `SELECT id, url, title from urls ${where} ORDER BY last_visit_time DESC LIMIT 30`,
            { '@query': `%${query}%` })
        if (results.length !== 1) {
            return []
        }

        return results[0].values.map(v => ({
            id: v[0] as number,
            url: v[1] as string,
            title: v[2] as string
        }))
    } finally {
        db.close()
    }
}


export function useChromeHistorySearch(query: string | undefined): ChromeHistorySearch {
    const [response, setResponse] = useState<HistoryEntry[]>()
    const [error, setError] = useState<string>()
    const [isLoading, setIsLoading] = useState<boolean>(true)

    let cancel = false

    useEffect(() => {
        async function getHistory() {
            if (cancel) return

            setError(undefined)

            try {
                const profileName = "Default"
                const response = await searchHistory(profileName, query)
                setResponse(response)
            } catch (e) {
                if (!cancel) {
                    setError(e as string)
                }
            } finally {
                if (!cancel)
                    setIsLoading(false)
            }
        }

        getHistory()

        return () => {
            cancel = true
        }

    }, [query])

    return { response, error, isLoading }
}
