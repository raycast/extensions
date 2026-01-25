import { LocalStorage } from "@raycast/api"
import {
  getEnvironments,
  saveEnvironment,
  deleteEnvironment,
  setActiveEnvironment,
  getActiveEnvironment,
  substituteVariables,
  Environment,
} from "../environmentStorage"

// Mock LocalStorage
jest.mock("@raycast/api", () => ({
  LocalStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}))

describe("environmentStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(null)
  })

  describe("getEnvironments", () => {
    it("should return default environments when none exist", async () => {
      const environments = await getEnvironments()
      expect(environments).toHaveLength(4)
      expect(environments[0].id).toBe("default")
      expect(environments[1].id).toBe("dev")
      expect(environments[2].id).toBe("staging")
      expect(environments[3].id).toBe("prod")
    })

    it("should return stored environments", async () => {
      const storedEnvs: Environment[] = [
        {
          id: "custom",
          name: "Custom",
          variables: { api_key: "123" },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]
      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedEnvs)
      )

      const environments = await getEnvironments()
      expect(environments).toEqual(storedEnvs)
    })
  })

  describe("saveEnvironment", () => {
    it("should save a new environment", async () => {
      const newEnv: Environment = {
        id: "test",
        name: "Test",
        variables: { base_url: "https://test.com" },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]))

      await saveEnvironment(newEnv)

      expect(LocalStorage.setItem).toHaveBeenCalled()
      const callArgs = (LocalStorage.setItem as jest.Mock).mock.calls[0]
      const savedEnvs = JSON.parse(callArgs[1])
      expect(savedEnvs).toHaveLength(1)
      expect(savedEnvs[0].id).toBe("test")
    })

    it("should update existing environment", async () => {
      const existingEnv: Environment = {
        id: "test",
        name: "Test",
        variables: { base_url: "https://test.com" },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const updatedEnv: Environment = {
        ...existingEnv,
        name: "Updated Test",
        variables: { base_url: "https://updated.com" },
      }

      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([existingEnv])
      )

      await saveEnvironment(updatedEnv)

      const callArgs = (LocalStorage.setItem as jest.Mock).mock.calls[0]
      const savedEnvs = JSON.parse(callArgs[1])
      expect(savedEnvs).toHaveLength(1)
      expect(savedEnvs[0].name).toBe("Updated Test")
      expect(savedEnvs[0].variables.base_url).toBe("https://updated.com")
    })
  })

  describe("deleteEnvironment", () => {
    it("should delete an environment", async () => {
      const envs: Environment[] = [
        {
          id: "1",
          name: "Env 1",
          variables: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "2",
          name: "Env 2",
          variables: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(envs)
      )

      await deleteEnvironment("1")

      const callArgs = (LocalStorage.setItem as jest.Mock).mock.calls[0]
      const savedEnvs = JSON.parse(callArgs[1])
      expect(savedEnvs).toHaveLength(1)
      expect(savedEnvs[0].id).toBe("2")
    })

    it("should clear active environment if deleted", async () => {
      const envs: Environment[] = [
        {
          id: "active",
          name: "Active",
          variables: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      ;(LocalStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === "environments") return Promise.resolve(JSON.stringify(envs))
        if (key === "active_environment") return Promise.resolve("active")
        return Promise.resolve(null)
      })

      await deleteEnvironment("active")

      expect(LocalStorage.removeItem).toHaveBeenCalledWith("active_environment")
    })
  })

  describe("setActiveEnvironment", () => {
    it("should set active environment", async () => {
      await setActiveEnvironment("env-id")

      expect(LocalStorage.setItem).toHaveBeenCalledWith(
        "active_environment",
        "env-id"
      )
    })

    it("should clear active environment when null", async () => {
      await setActiveEnvironment(null)

      expect(LocalStorage.removeItem).toHaveBeenCalledWith("active_environment")
    })
  })

  describe("getActiveEnvironment", () => {
    it("should return active environment", async () => {
      const envs: Environment[] = [
        {
          id: "active",
          name: "Active",
          variables: { key: "value" },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      ;(LocalStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === "environments") return Promise.resolve(JSON.stringify(envs))
        if (key === "active_environment") return Promise.resolve("active")
        return Promise.resolve(null)
      })

      const active = await getActiveEnvironment()
      expect(active).toEqual(envs[0])
    })

    it("should return null when no active environment", async () => {
      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(null)

      const active = await getActiveEnvironment()
      expect(active).toBeNull()
    })
  })

  describe("substituteVariables", () => {
    it("should substitute variables in text", () => {
      const environment: Environment = {
        id: "test",
        name: "Test",
        variables: {
          base_url: "https://api.example.com",
          api_key: "secret123",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const text = "{{base_url}}/users?key={{api_key}}"
      const result = substituteVariables(text, environment)

      expect(result).toBe("https://api.example.com/users?key=secret123")
    })

    it("should leave unmatched variables as-is", () => {
      const environment: Environment = {
        id: "test",
        name: "Test",
        variables: {
          base_url: "https://api.example.com",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const text = "{{base_url}}/users?key={{unknown}}"
      const result = substituteVariables(text, environment)

      expect(result).toBe("https://api.example.com/users?key={{unknown}}")
    })

    it("should handle null environment", () => {
      const text = "{{base_url}}/users"
      const result = substituteVariables(text, null)

      expect(result).toBe("{{base_url}}/users")
    })
  })
})
