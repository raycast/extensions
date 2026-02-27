import http from "http";
import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = "http://127.0.0.1:17638";

interface ApiResponse {
  status: number;
  body: {
    ok: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; message: string; hint?: string };
  };
}

function request(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const payload = body ? JSON.stringify(body) : undefined;

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        timeout: 5000,
        headers: payload
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
            }
          : undefined,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
          } catch {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      },
    );
    req.on("error", (err) =>
      reject(
        new Error(
          `Connection failed (is the bridge server running?): ${err.message}`,
        ),
      ),
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Preflight ───────────────────────────────────────────────────────
beforeAll(async () => {
  try {
    await request("GET", "/health");
  } catch {
    throw new Error(
      "Bridge server is not running on port 17638. Start it from Raycast first.",
    );
  }
});

// ─── GET /health ─────────────────────────────────────────────────────
describe("GET /health", () => {
  it("returns ok with server info", async () => {
    const { status, body } = await request("GET", "/health");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.status).toBe("ok");
    expect(body.data?.bridge).toBe("raycast-bridge");
    expect(body.data?.protocolVersion).toBe(1);
    expect(body.data?.port).toBe(17638);
    expect(body.data?.pid).toBeTypeOf("number");
    expect(body.data?.uptime).toBeTypeOf("number");
    expect(body.data?.raycastVersion).toBeTypeOf("string");
  });
});

// ─── OPTIONS (CORS) ──────────────────────────────────────────────────
describe("OPTIONS (CORS)", () => {
  it("returns 204", async () => {
    const { status } = await new Promise<{ status: number }>(
      (resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port: 17638,
            path: "/health",
            method: "OPTIONS",
            timeout: 5000,
          },
          (res) => {
            res.resume();
            resolve({ status: res.statusCode || 0 });
          },
        );
        req.on("error", reject);
        req.end();
      },
    );
    expect(status).toBe(204);
  });
});

// ─── GET /extensions ─────────────────────────────────────────────────
describe("GET /extensions", () => {
  it("returns a list of installed extensions", async () => {
    const { status, body } = await request("GET", "/extensions");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.count).toBeTypeOf("number");
    expect(Array.isArray(body.data?.extensions)).toBe(true);
    expect(body.data?.count as number).toBeGreaterThan(0);

    const ext = (body.data?.extensions as Record<string, unknown>[])[0];
    expect(ext.name).toBeTypeOf("string");
    expect(ext.author).toBeTypeOf("string");
    expect(ext.title).toBeTypeOf("string");
    expect(Array.isArray(ext.commands)).toBe(true);
  });

  it("filters extensions by name", async () => {
    const { body: all } = await request("GET", "/extensions");
    const extensions = all.data?.extensions as Record<string, unknown>[];
    if (extensions.length === 0) return;

    const firstName = extensions[0].name as string;
    const { status, body } = await request(
      "GET",
      `/extensions?name=${firstName}`,
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.count).toBe(1);
  });
});

// ─── GET /extensions/:author/:name ───────────────────────────────────
describe("GET /extensions/:author/:name", () => {
  it("returns details for a specific extension", async () => {
    const { body: all } = await request("GET", "/extensions");
    const extensions = all.data?.extensions as Record<string, unknown>[];
    if (extensions.length === 0) return;

    const ext = extensions[0];
    const { status, body } = await request(
      "GET",
      `/extensions/${ext.author}/${ext.name}`,
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.name).toBe(ext.name);
    expect(body.data?.author).toBe(ext.author);
  });

  it("returns 404 for non-existent extension", async () => {
    const { status, body } = await request(
      "GET",
      "/extensions/nobody/nonexistent",
    );
    expect(status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("EXTENSION_NOT_FOUND");
    expect(body.error?.hint).toBeTypeOf("string");
  });
});

// ─── GET /apps ───────────────────────────────────────────────────────
describe("GET /apps", () => {
  it("returns a list of installed macOS applications", async () => {
    const { status, body } = await request("GET", "/apps");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.count).toBeTypeOf("number");
    expect(Array.isArray(body.data?.apps)).toBe(true);
    expect(body.data?.count as number).toBeGreaterThan(0);
  });
});

// ─── GET /frontmost ──────────────────────────────────────────────────
describe("GET /frontmost", () => {
  it("returns the frontmost application", async () => {
    const { status, body } = await request("GET", "/frontmost");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.name).toBeTypeOf("string");
    expect(body.data?.path).toBeTypeOf("string");
  });
});

// ─── GET /clipboard ──────────────────────────────────────────────────
describe("GET /clipboard", () => {
  it("returns clipboard contents", async () => {
    const { status, body } = await request("GET", "/clipboard");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("accepts offset parameter", async () => {
    const { status, body } = await request("GET", "/clipboard?offset=0");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

// ─── GET /selected-text ──────────────────────────────────────────────
describe("GET /selected-text", () => {
  it("returns text or error with hint", async () => {
    const { status, body } = await request("GET", "/selected-text");
    if (status === 200) {
      expect(body.ok).toBe(true);
      expect(body.data?.text).toBeTypeOf("string");
    } else {
      expect(status).toBe(500);
      expect(body.ok).toBe(false);
      expect(body.error?.code).toBe("INTERNAL_ERROR");
      expect(body.error?.hint).toBeTypeOf("string");
    }
  });
});

// ─── POST /run ───────────────────────────────────────────────────────
describe("POST /run", () => {
  it("rejects invalid JSON body", async () => {
    const { status, body } = await new Promise<ApiResponse>(
      (resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port: 17638,
            path: "/run",
            method: "POST",
            timeout: 5000,
            headers: { "Content-Type": "application/json" },
          },
          (res) => {
            let data = "";
            res.on("data", (chunk: Buffer) => (data += chunk.toString()));
            res.on("end", () =>
              resolve({
                status: res.statusCode || 0,
                body: JSON.parse(data),
              }),
            );
          },
        );
        req.on("error", reject);
        req.write("not json");
        req.end();
      },
    );
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("INVALID_JSON");
  });

  it("rejects missing required fields", async () => {
    const { status, body } = await request("POST", "/run", { owner: "test" });
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("MISSING_FIELDS");
  });

  it("returns error for non-existent extension", async () => {
    const { status, body } = await request("POST", "/run", {
      owner: "nobody",
      extension: "nonexistent",
      command: "fake",
    });
    expect(status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("COMMAND_FAILED");
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────
describe("404 handling", () => {
  it("returns 404 with error envelope for unknown routes", async () => {
    const { status, body } = await request("GET", "/nonexistent");
    expect(status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("NOT_FOUND");
  });
});
