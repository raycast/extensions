import { describe, expect, it, vi } from "vitest";
import { ClassroomApi, classroomLink, dueDate } from "../src/lib/api";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const course = { id: "course-1", name: "Astronomy" };
const work = {
  id: "assignment-1",
  courseId: course.id,
  title: "Moon observation",
};

describe("Classroom adapter", () => {
  it("loads every course page without losing the original state filter", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json({ courses: [course], nextPageToken: "next page" }),
      )
      .mockResolvedValueOnce(
        json({ courses: [{ id: "course-2", name: "Physics" }] }),
      );
    expect(
      (await new ClassroomApi("test-token", fetcher).courses("ARCHIVED")).map(
        (x) => x.id,
      ),
    ).toEqual([course.id, "course-2"]);
    const url = new URL(String(fetcher.mock.calls[1][0]));
    expect(url.searchParams.get("pageToken")).toBe("next page");
    expect(url.searchParams.get("courseStates")).toBe("ARCHIVED");
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      redirect: "error",
      headers: { Authorization: "Bearer test-token" },
    });
  });
  it("encodes course IDs and retrieves published coursework only", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ courseWork: [work] }));
    const result = await new ClassroomApi("test-token", fetcher).coursework({
      ...course,
      id: "a/b",
    });
    expect(String(fetcher.mock.calls[0][0])).toContain("a%2Fb/courseWork");
    expect(
      new URL(String(fetcher.mock.calls[0][0])).searchParams.get(
        "courseWorkStates",
      ),
    ).toBe("PUBLISHED");
    expect(result[0].courseName).toBe("Astronomy");
  });
  it("accepts an empty API list", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({}));
    expect(await new ClassroomApi("test-token", fetcher).courses()).toEqual([]);
  });
  it("stops repeated pagination tokens", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        json({ courses: [], nextPageToken: "same" }),
      );
    await expect(
      new ClassroomApi("test-token", fetcher).courses(),
    ).rejects.toThrow("repeated or invalid");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    null,
    [],
    { courses: "bad" },
    { courses: [{ id: 12, name: "Bad" }] },
  ])("rejects malformed course responses: %j", async (body) => {
    await expect(
      new ClassroomApi(
        "test-token",
        vi.fn<typeof fetch>().mockResolvedValue(json(body)),
      ).courses(),
    ).rejects.toThrow();
  });
  it.each([
    [401, "expired"],
    [403, "denied"],
    [429, "request limit"],
  ])(
    "explains HTTP %i without exposing response bodies",
    async (status, message) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(json({ secret: "do-not-log" }, status as number));
      await expect(
        new ClassroomApi("test-token", fetcher).courses(),
      ).rejects.toThrow(message as string);
    },
  );
  it("retains successful courses and reports a denied course", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (url) =>
        String(url).includes("denied")
          ? json({}, 403)
          : json({ courseWork: [work] }),
      );
    const result = await new ClassroomApi("test-token", fetcher).assignments([
      course,
      { id: "denied", name: "Denied Course" },
    ]);
    expect(result.items).toHaveLength(1);
    expect(result.failures).toEqual([
      {
        courseId: "denied",
        course: "Denied Course",
        message: expect.stringContaining("denied"),
      },
    ]);
  });
  it("retains distinct identities for two denied courses with the same display name", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({}, 403));
    const result = await new ClassroomApi("test-token", fetcher).assignments([
      { id: "math-a", name: "Mathematics" },
      { id: "math-b", name: "Mathematics" },
    ]);
    expect(result.items).toEqual([]);
    expect(result.failures).toEqual([
      {
        courseId: "math-a",
        course: "Mathematics",
        message: expect.stringContaining("denied"),
      },
      {
        courseId: "math-b",
        course: "Mathematics",
        message: expect.stringContaining("denied"),
      },
    ]);
    expect(
      new Set(result.failures.map((failure) => failure.courseId)).size,
    ).toBe(2);
  });
  it("limits course fetches to four concurrent requests", async () => {
    let running = 0;
    let peak = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      peak = Math.max(peak, ++running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running--;
      return json({ courseWork: [] });
    });
    await new ClassroomApi("test-token", fetcher).assignments(
      Array.from({ length: 11 }, (_, index) => ({
        id: String(index),
        name: `Course ${index}`,
      })),
    );
    expect(peak).toBe(4);
  });
  it("interprets Google's deadline fields in UTC", () => {
    expect(
      dueDate({
        ...work,
        dueDate: { year: 2026, month: 10, day: 10 },
        dueTime: { hours: 23, minutes: 59 },
      })?.toISOString(),
    ).toBe("2026-10-10T23:59:00.000Z");
    expect(dueDate(work)).toBeUndefined();
  });
  it("only offers valid Classroom HTTPS links", () => {
    expect(classroomLink("https://classroom.google.com/c/123")).toBe(
      "https://classroom.google.com/c/123",
    );
    for (const url of [
      "javascript:alert(1)",
      "https://classroom.google.com.attacker.test/c/1",
      "https://user:password@classroom.google.com/c/1",
      "http://classroom.google.com/c/1",
    ])
      expect(classroomLink(url)).toBeUndefined();
  });
});
