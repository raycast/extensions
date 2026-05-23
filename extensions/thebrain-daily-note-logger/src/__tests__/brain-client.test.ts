import { BrainClient, BrainError, buildUpdatedNote } from "../brain-client";

const fetchMock = jest.fn();

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});

let client: BrainClient;

beforeEach(() => {
  fetchMock.mockClear();
  client = new BrainClient("http://localhost:8001", "test-key");
  client.brainId = "brain-1";
});

function mockFetch(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  });
}

// --- BrainClient ---

describe("getState", () => {
  it("returns parsed state", async () => {
    mockFetch(200, { currentBrainId: "brain-1", currentBrainName: "My Brain" });
    const state = await client.getState();
    expect(state?.currentBrainId).toBe("brain-1");
  });

  it("sends Bearer auth header", async () => {
    mockFetch(200, { currentBrainId: "brain-1" });
    await client.getState();
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer test-key");
  });

  it("throws BrainError on HTTP error", async () => {
    mockFetch(401, "Unauthorized");
    await expect(client.getState()).rejects.toThrow(BrainError);
  });
});

describe("getThoughtByName", () => {
  it("returns thought when found", async () => {
    mockFetch(200, { id: "thought-1", name: "Daily Notes" });
    const t = await client.getThoughtByName("Daily Notes");
    expect(t?.id).toBe("thought-1");
  });

  it("returns null on 404", async () => {
    mockFetch(404, "Not Found");
    const t = await client.getThoughtByName("Missing");
    expect(t).toBeNull();
  });

  it("re-throws non-404 HTTP errors", async () => {
    mockFetch(500, "Server Error");
    await expect(client.getThoughtByName("X")).rejects.toThrow(BrainError);
  });
});

describe("getChildren", () => {
  it("returns children array", async () => {
    mockFetch(200, { children: [{ id: "c1", name: "2026" }] });
    const children = await client.getChildren("parent-id");
    expect(children).toEqual([{ id: "c1", name: "2026" }]);
  });

  it("returns empty array when children key is absent", async () => {
    mockFetch(200, {});
    const children = await client.getChildren("parent-id");
    expect(children).toEqual([]);
  });
});

describe("getNote", () => {
  it("returns noteContent string", async () => {
    mockFetch(200, { noteContent: "<html><body><h2>Log</h2></body></html>" });
    const html = await client.getNote("thought-1");
    expect(html).toBe("<html><body><h2>Log</h2></body></html>");
  });

  it("returns empty string on 404", async () => {
    mockFetch(404, "Not Found");
    const html = await client.getNote("thought-1");
    expect(html).toBe("");
  });

  it("returns empty string when noteContent is absent", async () => {
    mockFetch(200, {});
    const html = await client.getNote("thought-1");
    expect(html).toBe("");
  });
});

describe("saveNote", () => {
  it("POSTs to the correct URL with noteContent body", async () => {
    mockFetch(200, "");
    await client.saveNote("thought-1", "<html><body></body></html>");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8001/api/notes/brain-1/thought-1");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      noteContent: "<html><body></body></html>",
    });
  });

  it("throws BrainError on HTTP error", async () => {
    mockFetch(500, "Server Error");
    await expect(client.saveNote("thought-1", "<html/>")).rejects.toThrow(
      BrainError,
    );
  });
});

// --- buildUpdatedNote ---

describe("buildUpdatedNote", () => {
  it("appends entry before </body> in existing HTML", () => {
    const html = "<html><body><h2>Log</h2></body></html>";
    const result = buildUpdatedNote(html, "8:18 AM", "Hello world");
    expect(result).toBe(
      "<html><body><h2>Log</h2><h4>8:18 AM Hello world</h4></body></html>",
    );
  });

  it("wraps in minimal HTML when note is empty", () => {
    const result = buildUpdatedNote("", "9:00 AM", "First entry");
    expect(result).toBe(
      "<html><body><h4>9:00 AM First entry</h4></body></html>",
    );
  });

  it("wraps in minimal HTML when note has no </body> tag", () => {
    const result = buildUpdatedNote("some plain text", "10:00 AM", "Entry");
    expect(result).toBe("<html><body><h4>10:00 AM Entry</h4></body></html>");
  });

  it("appends after existing log entries", () => {
    const html = "<html><body><h2>Log</h2><h4>8:00 AM First</h4></body></html>";
    const result = buildUpdatedNote(html, "9:00 AM", "Second");
    expect(result).toBe(
      "<html><body><h2>Log</h2><h4>8:00 AM First</h4><h4>9:00 AM Second</h4></body></html>",
    );
  });
});
