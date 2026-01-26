import { generateCurl } from "../curlGenerator"
import { RequestType, MethodsType } from "../../types"

describe("generateCurl", () => {
  describe("Basic GET requests", () => {
    it("should generate a simple GET request", () => {
      const request: RequestType = {
        method: "GET",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("curl -X GET")
      expect(curl).toContain("https://api.example.com/users")
    })

    it("should generate GET request with query parameters", () => {
      const request: RequestType = {
        method: "GET",
        url: {
          raw: "https://api.example.com/users?page=1&limit=10",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
          query: [
            { key: "page", value: "1", type: "text", disabled: false },
            { key: "limit", value: "10", type: "text", disabled: false },
          ],
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("curl -X GET")
      expect(curl).toContain("https://api.example.com/users?page=1&limit=10")
    })
  })

  describe("POST requests", () => {
    it("should generate POST with JSON body", () => {
      const request: RequestType = {
        method: "POST",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
        header: [
          {
            key: "Content-Type",
            value: "application/json",
            type: "text",
            disabled: false,
          },
        ],
        body: {
          mode: "raw",
          raw: '{"name":"John","email":"john@example.com"}',
          options: {
            raw: {
              language: "json",
            },
          },
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("curl -X POST")
      expect(curl).toContain('"Content-Type: application/json"')
      expect(curl).toContain("-d")
      expect(curl).toContain("name")
    })

    it("should generate POST with urlencoded body", () => {
      const request: RequestType = {
        method: "POST",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
        body: {
          mode: "urlencoded",
          urlencoded: [
            { key: "name", value: "John Doe", disabled: false },
            { key: "email", value: "john@example.com", disabled: false },
          ],
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("curl -X POST")
      expect(curl).toContain("-d")
      expect(curl).toContain("name")
      expect(curl).toContain("email")
    })

    it("should generate POST with formdata body", () => {
      const request: RequestType = {
        method: "POST",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
        body: {
          mode: "formdata",
          formdata: [
            { key: "name", value: "John", type: "text", disabled: false },
            {
              key: "email",
              value: "john@example.com",
              type: "text",
              disabled: false,
            },
          ],
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("curl -X POST")
      expect(curl).toContain("-F")
      expect(curl).toContain("name=John")
    })
  })

  describe("Headers", () => {
    it("should include headers in curl command", () => {
      const request: RequestType = {
        method: "GET",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
        header: [
          {
            key: "Authorization",
            value: "Bearer token123",
            type: "text",
            disabled: false,
          },
          {
            key: "Content-Type",
            value: "application/json",
            type: "text",
            disabled: false,
          },
        ],
      }

      const curl = generateCurl(request)

      expect(curl).toContain('"Authorization: Bearer token123"')
      expect(curl).toContain('"Content-Type: application/json"')
    })

    it("should exclude disabled headers", () => {
      const request: RequestType = {
        method: "GET",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
        header: [
          {
            key: "Authorization",
            value: "Bearer token123",
            type: "text",
            disabled: false,
          },
          {
            key: "X-Custom-Header",
            value: "value",
            type: "text",
            disabled: true,
          },
        ],
      }

      const curl = generateCurl(request)

      expect(curl).toContain("Authorization")
      expect(curl).not.toContain("X-Custom-Header")
    })

    it("should exclude headers with empty keys", () => {
      const request: RequestType = {
        method: "GET",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
        header: [
          {
            key: "Authorization",
            value: "Bearer token123",
            type: "text",
            disabled: false,
          },
          {
            key: "",
            value: "value",
            type: "text",
            disabled: false,
          },
        ],
      }

      const curl = generateCurl(request)

      expect(curl).toContain("Authorization")
      // Empty key header should not appear
      const headerCount = (curl.match(/-H/g) || []).length
      expect(headerCount).toBe(1)
    })
  })

  describe("HTTP methods", () => {
    it.each([
      ["GET", "GET"],
      ["POST", "POST"],
      ["PUT", "PUT"],
      ["PATCH", "PATCH"],
      ["DELETE", "DELETE"],
      ["HEAD", "HEAD"],
      ["OPTIONS", "OPTIONS"],
    ])("should generate %s request", (method, expected) => {
      const request: RequestType = {
        method: expected as MethodsType,
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain(`curl -X ${expected}`)
    })

    it("should default to GET if method is not specified", () => {
      const request: RequestType = {
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("curl -X GET")
    })
  })

  describe("Edge cases", () => {
    it("should handle request without URL", () => {
      const request: RequestType = {
        method: "GET",
      }

      const curl = generateCurl(request)

      expect(curl).toBe("")
    })

    it("should handle request with empty URL", () => {
      const request: RequestType = {
        method: "GET",
        url: {
          raw: "",
        },
      }

      const curl = generateCurl(request)

      expect(curl).toBe("")
    })

    it("should handle request without headers", () => {
      const request: RequestType = {
        method: "GET",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("curl -X GET")
      expect(curl).not.toContain("-H")
    })

    it("should handle request without body", () => {
      const request: RequestType = {
        method: "POST",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("curl -X POST")
      expect(curl).not.toContain("-d")
      expect(curl).not.toContain("-F")
    })

    it("should handle disabled formdata fields", () => {
      const request: RequestType = {
        method: "POST",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
        body: {
          mode: "formdata",
          formdata: [
            { key: "name", value: "John", type: "text", disabled: false },
            {
              key: "email",
              value: "john@example.com",
              type: "text",
              disabled: true,
            },
          ],
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("name=John")
      expect(curl).not.toContain("email")
    })

    it("should handle disabled urlencoded fields", () => {
      const request: RequestType = {
        method: "POST",
        url: {
          raw: "https://api.example.com/users",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users"],
        },
        body: {
          mode: "urlencoded",
          urlencoded: [
            { key: "name", value: "John", disabled: false },
            { key: "email", value: "john@example.com", disabled: true },
          ],
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("name")
      expect(curl).not.toContain("email")
    })
  })

  describe("Complex requests", () => {
    it("should generate a complex request with all features", () => {
      const request: RequestType = {
        method: "POST",
        url: {
          raw: "https://api.example.com/users/123/posts?published=true",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users", "123", "posts"],
          query: [{ key: "published", value: "true", type: "text", disabled: false }],
        },
        header: [
          {
            key: "Authorization",
            value: "Bearer token123",
            type: "text",
            disabled: false,
          },
          {
            key: "Content-Type",
            value: "application/json",
            type: "text",
            disabled: false,
          },
        ],
        body: {
          mode: "raw",
          raw: '{"title":"My Post","content":"Content here"}',
          options: {
            raw: {
              language: "json",
            },
          },
        },
      }

      const curl = generateCurl(request)

      expect(curl).toContain("curl -X POST")
      expect(curl).toContain('"Authorization: Bearer token123"')
      expect(curl).toContain('"Content-Type: application/json"')
      expect(curl).toContain("-d")
      expect(curl).toContain("title")
      expect(curl).toContain("https://api.example.com/users/123/posts?published=true")
    })
  })
})
