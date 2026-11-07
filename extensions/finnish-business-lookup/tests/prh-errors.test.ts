import { expect, spyOn, test } from "bun:test";
import { searchCompanies } from "../src/api/prh";

test("a shared failing PRH request produces the correct language for each caller", async () => {
  const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ message: "Service unavailable" }), { status: 503 }),
  );
  try {
    const requests = await Promise.allSettled([
      searchCompanies({ businessId: "0112038-9", language: "fi" }),
      searchCompanies({ businessId: "0112038-9", language: "en" }),
    ]);
    expect(requests[0].status).toBe("rejected");
    expect(requests[1].status).toBe("rejected");
    if (requests[0].status === "rejected" && requests[1].status === "rejected") {
      expect(requests[0].reason.message).toBe("PRH-pyyntö epäonnistui (503): Service unavailable");
      expect(requests[1].reason.message).toBe("PRH request failed (503): Service unavailable");
    }
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchSpy.mock.calls[0][0]));
    expect([...url.searchParams.keys()]).toEqual(["businessId", "page"]);
  } finally {
    fetchSpy.mockRestore();
  }
});
