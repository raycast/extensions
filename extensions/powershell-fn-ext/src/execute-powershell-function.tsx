import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast, Cache } from "@raycast/api"
import { usePromise } from "@raycast/utils"
import { exec } from "child_process"
import { promisify } from "util"
import { homedir } from "os"
import { existsSync, realpathSync, readFileSync, statSync } from "fs"
import { useEffect, useState } from "react"

const execAsync = promisify(exec)
const cache = new Cache()

interface Preferences {
    scriptPath: string
}

interface PowerShellFunction {
    name: string
    icon: string
}

interface CachedFunctions {
    mtime: string
    functions: PowerShellFunction[]
}

function escapePowerShellPath(path: string): string {
    return path.replace(/'/g, "''").replace(/\\/g, "\\\\")
}

async function getFileKey(filePath: string): Promise<string> {
    return `functions-${filePath}`
}

async function fetchFunctions(filePath: string, forceReload = false): Promise<PowerShellFunction[]> {
    try {
        const cacheKey = await getFileKey(filePath)
        const stats = statSync(filePath)
        const fileMtime = stats.mtime.toISOString()

        if (!forceReload) {
            const cached = cache.get(cacheKey)
            if (cached) {
                const cachedData: CachedFunctions = JSON.parse(cached)
                if (cachedData.mtime === fileMtime) {
                    console.log("[CACHE] Loading functions from valid cache")
                    return cachedData.functions
                }
            }
        }

        console.log("[CACHE] Loading fresh functions due to cache miss or file change")
        const fileContent = readFileSync(filePath, "utf-8")
        const functions: PowerShellFunction[] = []
        const lines = fileContent.split(/\r?\n/)

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const functionMatch = line.match(/function ([\w-]+)/)

            if (functionMatch) {
                let icon = "Icon.Cog" // Default icon
                if (i > 0) {
                    const prevLine = lines[i - 1]
                    const iconMatch = prevLine.match(/# @raycast.icon (Icon\.\w+)/)
                    if (iconMatch) {
                        icon = iconMatch[1]
                    }
                }
                functions.push({ name: functionMatch[1], icon: icon })
            }
        }

        const newCachedData: CachedFunctions = {
            mtime: fileMtime,
            functions: functions,
        }

        cache.set(cacheKey, JSON.stringify(newCachedData))

        return functions
    } catch (error) {
        console.error("Error fetching functions:", error)
        throw new Error(`Failed to parse PowerShell script: ${error instanceof Error ? error.message : String(error)}`)
    }
}

async function executePowerShellFunction(functionName: string, scriptPath: string) {
    const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Executing "${functionName}"...
`,
    })

    try {
        const escapedPath = escapePowerShellPath(scriptPath)
        const command = `. '${escapedPath}'; ${functionName}`

        const { stdout, stderr } = await execAsync(`pwsh.exe -NoProfile -ExecutionPolicy Bypass -Command "${command}"`)

        if (stderr) {
            throw new Error(stderr)
        }

        toast.style = Toast.Style.Success
        toast.title = `Executed "${functionName}" Successfully`
        toast.message = stdout.trim() ? `Output: ${stdout.trim()}` : undefined
    } catch (error) {
        toast.style = Toast.Style.Failure
        toast.title = `Failed to Execute "${functionName}"`
        toast.message = error instanceof Error ? error.message : "An unknown error occurred"
        console.error(`Error executing function "${functionName}":`, error)
    }
}

function getIcon(iconName?: string): Icon {
    if (!iconName) {
        return Icon.Cog
    }
    const iconKey = iconName.split(".")[1]
    if (iconKey && iconKey in Icon) {
        return Icon[iconKey as keyof typeof Icon]
    }
    console.warn(`Invalid icon name: "${iconName}". Falling back to default icon.`)
    return Icon.Cog
}

function PathErrorView({ error, onReload }: { error: string; onReload: () => void }) {
    return (
        <List>
            <List.EmptyView
                title="Invalid Path"
                description={error}
                icon={Icon.XMarkCircle}
                actions={
                    <ActionPanel>
                        <Action title="Reload" icon={Icon.Repeat} onAction={onReload} />
                    </ActionPanel>
                }
            />
        </List>
    )
}

function FunctionListItem({
    func,
    resolvedPath,
    onReload,
}: {
    func: PowerShellFunction
    resolvedPath: string
    onReload: () => void
}) {
    return (
        <List.Item
            title={func.name}
            icon={getIcon(func.icon)}
            actions={
                <ActionPanel>
                    <Action
                        title="Execute Function"
                        icon={Icon.Play}
                        onAction={() => executePowerShellFunction(func.name, resolvedPath)}
                    />
                    <Action
                        title="Reload Functions"
                        icon={Icon.Repeat}
                        onAction={onReload}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                </ActionPanel>
            }
        />
    )
}

function FunctionsEmptyView({
    fetchError,
    isLoading,
    resolvedPath,
    onReload,
}: {
    fetchError?: string
    isLoading: boolean
    resolvedPath?: string
    onReload: () => void
}) {
    return (
        <List.EmptyView
            title={isLoading ? "Loading Functions..." : "No Parameter-less Functions Found"}
            description={
                fetchError ||
                (isLoading
                    ? "Reading your script..."
                    : `Ensure the file at "${resolvedPath}" contains functions without arguments.`)
            }
            icon={Icon.Cog}
            actions={
                <ActionPanel>
                    <Action title="Reload Functions" icon={Icon.Repeat} onAction={onReload} />
                </ActionPanel>
            }
        />
    )
}

export default function Command() {
    const preferences = getPreferenceValues<Preferences>()
    const [resolvedPath, setResolvedPath] = useState<string>()
    const [pathError, setPathError] = useState<string>()
    const [cacheBuster, setCacheBuster] = useState(0)

    useEffect(() => {
        try {
            const initialPath = preferences.scriptPath
            if (!initialPath) {
                throw new Error("PowerShell Script Path preference is not set.")
            }

            const expandedPath = initialPath.replace(/^~/, homedir())

            if (!existsSync(expandedPath)) {
                throw new Error(`File not found at: ${expandedPath}`)
            }

            const realPath = realpathSync(expandedPath)
            setResolvedPath(realPath)
            setPathError(undefined)
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while resolving the path."
            setPathError(errorMessage)
            setResolvedPath(undefined)
            console.error("Path resolution error:", e)
        }
    }, [preferences.scriptPath])

    const {
        data: functions,
        isLoading,
        error,
    } = usePromise(
        async (path: string | undefined, bust: number) => {
            if (!path) return []
            return await fetchFunctions(path, bust > 0)
        },
        [resolvedPath, cacheBuster],
    )

    const handleReload = async () => {
        console.log("[CACHE] Force reload requested")
        if (resolvedPath) {
            const cacheKey = await getFileKey(resolvedPath)
            cache.remove(cacheKey) // Clear the cache
        }
        setCacheBuster(prev => prev + 1) // Force re-fetch
    }

    if (pathError) {
        return (
            <PathErrorView
                error={pathError}
                onReload={() => {
                    setPathError(undefined)
                    setResolvedPath(undefined)
                }}
            />
        )
    }

    const fetchError = error ? `Failed to read functions: ${error.message}` : undefined

    return (
        <List isLoading={isLoading && !error && !pathError} searchBarPlaceholder="Filter functions...">
            {functions && functions.length > 0 ? (
                functions.map((func, index) => (
                    <FunctionListItem
                        key={`${func.name}-${index}`}
                        func={func}
                        resolvedPath={resolvedPath!}
                        onReload={handleReload}
                    />
                ))
            ) : (
                <FunctionsEmptyView
                    fetchError={fetchError}
                    isLoading={isLoading}
                    resolvedPath={resolvedPath}
                    onReload={handleReload}
                />
            )}
        </List>
    )
}
