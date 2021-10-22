import path from "path"
import fs from "fs"
import util from "util"
import initSqlJs, { Database } from "sql.js"
import { useEffect, useRef, useState } from "react"
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
)

const getProfileName = () => "Default"

const loadDb = async (profileName: string): Promise<Database> => {
    const dbPath = historyDbPath(profileName)
    const fileBuffer = await fsReadFile(dbPath)
    const SQL = await initSqlJs({
        locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm")
    })
    return new SQL.Database(fileBuffer)
}

const searchHistory = async (db: Database, query: string | undefined): Promise<HistoryEntry[]> => {
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
}

export function useChromeHistorySearch(query: string | undefined): ChromeHistorySearch {
    const [response, setResponse] = useState<HistoryEntry[]>()
    const [error, setError] = useState<string>()
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const dbRef = useRef<Database>()

    let cancel = false

    useEffect(() => {
        async function getHistory() {
            if (cancel) { return }

            if (!dbRef.current) {
                const profileName = getProfileName()
                dbRef.current = await loadDb(profileName)
            }

            setError(undefined)
            try {
                const response = await searchHistory(dbRef.current, query)
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

    // Dispose of the database
    useEffect(() => {
        return () => {
            dbRef.current?.close()
        }
    }, [])

    return { response, error, isLoading }
}
