import { LocalStorage } from "@raycast/api"

export type Environment = {
  id: string
  name: string
  variables: Record<string, string>
  createdAt: number
  updatedAt: number
}

const ENVIRONMENTS_KEY = "environments"
const ACTIVE_ENVIRONMENT_KEY = "active_environment"

export const getEnvironments = async (): Promise<Environment[]> => {
  try {
    const envsJson = await LocalStorage.getItem<string>(ENVIRONMENTS_KEY)
    if (!envsJson) {
      // Create default environments
      const defaultEnvs = createDefaultEnvironments()
      await LocalStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(defaultEnvs))
      return defaultEnvs
    }
    return JSON.parse(envsJson) as Environment[]
  } catch (error) {
    console.error("Failed to get environments:", error)
    return createDefaultEnvironments()
  }
}

export const saveEnvironment = async (environment: Environment): Promise<void> => {
  try {
    const environments = await getEnvironments()
    const existingIndex = environments.findIndex((env) => env.id === environment.id)

    if (existingIndex >= 0) {
      environments[existingIndex] = { ...environment, updatedAt: Date.now() }
    } else {
      environments.push({ ...environment, updatedAt: Date.now() })
    }

    await LocalStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(environments))
  } catch (error) {
    console.error("Failed to save environment:", error)
    throw error
  }
}

export const deleteEnvironment = async (id: string): Promise<void> => {
  try {
    const environments = await getEnvironments()
    const filtered = environments.filter((env) => env.id !== id)
    await LocalStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(filtered))

    // If deleted environment was active, clear active environment
    const activeId = await getActiveEnvironmentId()
    if (activeId === id) {
      await LocalStorage.removeItem(ACTIVE_ENVIRONMENT_KEY)
    }
  } catch (error) {
    console.error("Failed to delete environment:", error)
    throw error
  }
}

export const getActiveEnvironmentId = async (): Promise<string | null> => {
  try {
    return await LocalStorage.getItem<string>(ACTIVE_ENVIRONMENT_KEY)
  } catch (error) {
    console.error("Failed to get active environment:", error)
    return null
  }
}

export const setActiveEnvironment = async (id: string | null): Promise<void> => {
  try {
    if (id) {
      await LocalStorage.setItem(ACTIVE_ENVIRONMENT_KEY, id)
    } else {
      await LocalStorage.removeItem(ACTIVE_ENVIRONMENT_KEY)
    }
  } catch (error) {
    console.error("Failed to set active environment:", error)
    throw error
  }
}

export const getActiveEnvironment = async (): Promise<Environment | null> => {
  try {
    const activeId = await getActiveEnvironmentId()
    if (!activeId) return null

    const environments = await getEnvironments()
    return environments.find((env) => env.id === activeId) || null
  } catch (error) {
    console.error("Failed to get active environment:", error)
    return null
  }
}

export const substituteVariables = (text: string, environment: Environment | null): string => {
  if (!environment) return text

  let result = text
  // Replace {{variable}} with environment value
  const variableRegex = /\{\{([^}]+)\}\}/g
  result = result.replace(variableRegex, (match, varName) => {
    const trimmedName = varName.trim()
    return environment.variables[trimmedName] || match
  })

  return result
}

const createDefaultEnvironments = (): Environment[] => {
  const now = Date.now()
  return [
    {
      id: "default",
      name: "Default",
      variables: {},
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "dev",
      name: "Development",
      variables: {
        base_url: "https://api.dev.example.com",
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "staging",
      name: "Staging",
      variables: {
        base_url: "https://api.staging.example.com",
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prod",
      name: "Production",
      variables: {
        base_url: "https://api.example.com",
      },
      createdAt: now,
      updatedAt: now,
    },
  ]
}
