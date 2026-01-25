import {
  parseRequest,
  prepareFinalURL,
  prettifyPathVariables,
  requestHasParams,
  requestHasVariables,
} from "../index"
import { RequestType, URLType } from "../../types"

describe("parseRequest", () => {
  it("should parse a request with URL", () => {
    const request: RequestType = {
      url: {
        raw: "https://api.example.com/users/123",
        protocol: "https",
        host: ["api", "example", "com"],
        path: ["users", "123"],
      },
    }

    const result = parseRequest(request)
    expect(result).toBeDefined()
    expect(result?.url).toBeDefined()
    expect(result?.url?.raw).toBe("https://api.example.com/users/123")
  })

  it("should return undefined for request without URL", () => {
    const request: RequestType = {}
    const result = parseRequest(request)
    expect(result).toBeUndefined()
  })
})

describe("requestHasVariables", () => {
  it("should detect path variables", () => {
    const url: URLType = {
      path: ["users", "{{userId}}", "posts"],
    }

    const result = requestHasVariables(url)
    expect(result).toEqual(["{{userId}}"])
  })

  it("should return undefined when no variables", () => {
    const url: URLType = {
      path: ["users", "123"],
    }

    const result = requestHasVariables(url)
    expect(result).toBeUndefined()
  })
})

describe("requestHasParams", () => {
  it("should detect query parameters", () => {
    const url: URLType = {
      path: ["users"],
      query: [
        { key: "page", type: "string", disabled: false, value: "1" },
        { key: "limit", type: "string", disabled: false, value: "10" },
      ],
    }

    const result = requestHasParams(url)
    expect(result).toBeDefined()
    expect(result?.length).toBe(2)
  })

  it("should return undefined when no params", () => {
    const url: URLType = {}
    const result = requestHasParams(url)
    expect(result).toBeUndefined()
  })
})

describe("prepareFinalURL", () => {
  it("should build URL from components", async () => {
    const url: URLType = {
      raw: "https://api.example.com/users",
      protocol: "https",
      host: ["api", "example", "com"],
      path: ["users"],
    }

    const result = await prepareFinalURL(url)
    expect(result).toBe("https://api.example.com/users")
  })

  it("should include path variables from payload", async () => {
    const url: URLType = {
      raw: "https://api.example.com/users/{{userId}}",
      protocol: "https",
      host: ["api", "example", "com"],
      path: ["users", "{{userId}}"],
    }

    const payload = { "{{userId}}": "123" }
    const result = await prepareFinalURL(url, payload)
    expect(result).toBe("https://api.example.com/users/123")
  })

  it("should include query parameters from payload", async () => {
    const url: URLType = {
      raw: "https://api.example.com/users",
      protocol: "https",
      host: ["api", "example", "com"],
      path: ["users"],
    }

    const payload = { page: "1", limit: "10" }
    const result = await prepareFinalURL(url, payload)
    expect(result).toBe("https://api.example.com/users?page=1&limit=10")
  })
})

describe("prettifyPathVariables", () => {
  it("should format path variables", () => {
    const result = prettifyPathVariables("{{user_id}}")
    expect(result).toBe("User Id")
  })

  it("should handle multiple words", () => {
    const result = prettifyPathVariables("{{api_key}}")
    expect(result).toBe("Api Key")
  })
})
