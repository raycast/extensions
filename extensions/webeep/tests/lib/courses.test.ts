import { describe, expect, it } from "vitest";
import { isInProgress, parseCourseName, sortCourses, toCourse } from "../../src/lib/courses";

const NOW = Date.UTC(2026, 8, 16);

describe("parseCourseName", () => {
  it("parses code, name, teachers and year", () => {
    expect(parseCourseName("089182 - FORMAL LANGUAGES AND COMPILERS (ROSSI MARIO) [2026-27]")).toEqual({
      code: "089182",
      name: "FORMAL LANGUAGES AND COMPILERS",
      teachers: "ROSSI MARIO",
      year: "2026-27",
    });
  });

  it("handles multiple teachers and parentheses inside the name", () => {
    expect(
      parseCourseName(
        "052511 - SISTEMI INFORMATIVI (PER IL SETTORE DELL'INFORMAZIONE) (BIANCHI ANNA, ROSSI MARIO) [2024-25]",
      ),
    ).toEqual({
      code: "052511",
      name: "SISTEMI INFORMATIVI (PER IL SETTORE DELL'INFORMAZIONE)",
      teachers: "BIANCHI ANNA, ROSSI MARIO",
      year: "2024-25",
    });
  });

  it("handles names with a year but no code", () => {
    expect(parseCourseName("Logica e Algebra [A.A. 2023-24]")).toEqual({
      name: "Logica e Algebra",
      year: "A.A. 2023-24",
    });
  });

  it("falls back to the full name", () => {
    expect(parseCourseName("Computer Science and Engineering")).toEqual({ name: "Computer Science and Engineering" });
  });
});

describe("isInProgress", () => {
  it("treats courses without an end date as in progress", () => {
    expect(isInProgress({ startdate: 1000, enddate: 0 }, NOW)).toBe(true);
  });

  it("treats courses ended in the past as finished", () => {
    expect(isInProgress({ startdate: 1000, enddate: 1725055200 }, NOW)).toBe(false);
  });

  it("treats courses not yet started as not in progress", () => {
    expect(isInProgress({ startdate: Math.floor(NOW / 1000) + 86400, enddate: 0 }, NOW)).toBe(false);
  });
});

describe("toCourse / sortCourses", () => {
  const raw = (id: number, fullname: string, enddate: number, isfavourite = false) => ({
    id,
    fullname,
    shortname: fullname,
    startdate: 1000,
    enddate,
    viewurl: `https://webeep.polimi.it/course/view.php?id=${id}`,
    isfavourite,
  });

  it("resolves multi-language names", () => {
    const course = toCourse(
      raw(1, "{mlang it}Ingegneria Informatica{mlang}{mlang en}Computer Engineering{mlang}", 0),
      "it",
      NOW,
    );
    expect(course.fullName).toBe("Ingegneria Informatica");
    expect(course.name).toBe("Ingegneria Informatica");
    expect(course.inProgress).toBe(true);
  });

  it("puts in-progress courses first, then favourites, then past courses by most recent year", () => {
    const sorted = sortCourses([
      toCourse(raw(1, "085877 - RETI LOGICHE (X) [2023-24]", 1725055200), "en", NOW),
      toCourse(raw(2, "052425 - ANALISI 2 (Y) [2024-25]", 1753999200), "en", NOW),
      toCourse(raw(3, "089183 - DATA BASES 2 (Z) [2026-27]", 0), "en", NOW),
      toCourse(raw(4, "088983 - OPERATIONS RESEARCH (W) [2026-27]", 0, true), "en", NOW),
    ]);
    expect(sorted.map((c) => c.id)).toEqual([4, 3, 2, 1]);
  });
});
