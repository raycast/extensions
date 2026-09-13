import { parseTaskText, PrefixMode } from "./index";

describe("Parse Task Text", () => {
  it("should return text with no intents as is", () => {
    expect(parseTaskText("Lorem Ipsum").text).toBe("Lorem Ipsum");
  });

  it("should not parse text when disabled", () => {
    const text = "Lorem Ipsum today *label +project !2 @user";
    const result = parseTaskText(text, PrefixMode.Disabled);
    expect(result.text).toBe(text);
  });

  it("should parse text in todoist mode", () => {
    const result = parseTaskText(
      "Lorem Ipsum today @label #project !2 +user",
      PrefixMode.Todoist,
    );
    expect(result.text).toBe("Lorem Ipsum  +user");
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0]).toBe("label");
    expect(result.project).toBe("project");
    expect(result.priority).toBe(2);
    expect(result.assignees).toHaveLength(1);
    expect(result.assignees[0]).toBe("user");
  });

  it("should ignore plain email addresses", () => {
    const text = "Lorem Ipsum email@example.com";
    expect(parseTaskText(text).text).toBe(text);
  });

  describe("Quote-escaped text", () => {
    it("should skip all parsing when wrapped in double quotes", () => {
      const result = parseTaskText('"delete mails up to january 30th"');
      expect(result.text).toBe("delete mails up to january 30th");
      expect(result.date).toBeNull();
      expect(result.labels).toHaveLength(0);
      expect(result.project).toBeNull();
      expect(result.priority).toBeNull();
      expect(result.repeats).toBeNull();
    });

    it("should skip all parsing when wrapped in single quotes", () => {
      const result = parseTaskText("'buy mass tomorrow *label !2 @user'");
      expect(result.text).toBe("buy mass tomorrow *label !2 @user");
      expect(result.date).toBeNull();
      expect(result.labels).toHaveLength(0);
    });

    it("should not skip parsing for unmatched quotes", () => {
      expect(parseTaskText('"delete mails today').date).not.toBeNull();
    });

    it("should not skip parsing for mismatched quote types", () => {
      expect(parseTaskText("\"delete mails today'").date).not.toBeNull();
    });

    it("should not skip parsing when quotes are in the middle", () => {
      expect(parseTaskText('delete "mails" today').date).not.toBeNull();
    });

    it("should handle empty quoted string", () => {
      const result = parseTaskText('""');
      expect(result.text).toBe("");
      expect(result.date).toBeNull();
    });
  });

  describe("Date Parsing", () => {
    it("should recognize today", () => {
      const result = parseTaskText("Lorem Ipsum today");
      const now = new Date();
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date?.getFullYear()).toBe(now.getFullYear());
      expect(result.date?.getMonth()).toBe(now.getMonth());
      expect(result.date?.getDate()).toBe(now.getDate());
    });

    it("should ignore casing", () => {
      expect(parseTaskText("Lorem Ipsum ToDay").text).toBe("Lorem Ipsum");
      expect(parseTaskText("Lorem Ipsum ToDay").date).not.toBeNull();
    });

    it("should recognize tonight at 21:00", () => {
      const result = parseTaskText("Lorem Ipsum tonight");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date?.getHours()).toBe(21);
    });

    it("should recognize tomorrow", () => {
      const result = parseTaskText("Lorem Ipsum tomorrow");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date?.getFullYear()).toBe(tomorrow.getFullYear());
      expect(result.date?.getMonth()).toBe(tomorrow.getMonth());
      expect(result.date?.getDate()).toBe(tomorrow.getDate());
    });

    it("should recognize next monday", () => {
      const result = parseTaskText("Lorem Ipsum next monday");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date).not.toBeNull();
    });

    it("should recognize next monday at the beginning", () => {
      const result = parseTaskText("next monday Lorem Ipsum");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date).not.toBeNull();
    });

    it("should recognize this weekend", () => {
      const result = parseTaskText("Lorem Ipsum this weekend");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date).not.toBeNull();
    });

    it("should recognize later this week", () => {
      const result = parseTaskText("Lorem Ipsum later this week");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date).not.toBeNull();
    });

    it("should recognize later next week", () => {
      const result = parseTaskText("Lorem Ipsum later next week");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date).not.toBeNull();
    });

    it("should recognize next week", () => {
      const result = parseTaskText("Lorem Ipsum next week");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date).not.toBeNull();
    });

    it("should recognize next month", () => {
      const result = parseTaskText("Lorem Ipsum next month");
      const nextMonth = new Date();
      nextMonth.setDate(1);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date?.getMonth()).toBe(nextMonth.getMonth());
      expect(result.date?.getDate()).toBe(1);
    });

    it("should recognize end of month", () => {
      const result = parseTaskText("Lorem Ipsum end of month");
      const cur = new Date();
      const expected = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.date?.getDate()).toBe(expected.getDate());
    });

    describe("with a time suffix", () => {
      const cases: Record<string, string> = {
        "at 15:00": "15:0",
        "@ 15:00": "15:0",
        "at 15:30": "15:30",
        "@ 3pm": "15:0",
        "at 3pm": "15:0",
        "at 3 pm": "15:0",
        "at 3am": "3:0",
        "at 3:12 am": "3:12",
        "at 3:12 pm": "15:12",
        "at 3:12 PM": "15:12",
        "at 12:00 pm": "12:0",
        "at 12:00 am": "0:0",
      };

      for (const c of Object.keys(cases)) {
        it(`should recognize today ${c}`, () => {
          const result = parseTaskText(`Lorem Ipsum today ${c}`);
          expect(result.text).toBe("Lorem Ipsum");
          expect(
            `${result.date?.getHours()}:${result.date?.getMinutes()}`,
          ).toBe(cases[c]);
          expect(result.date?.getSeconds()).toBe(0);
        });
      }
    });

    describe("at text boundaries", () => {
      const now = new Date();
      now.setFullYear(2021, 5, 24);

      const cases: Array<[string, string, string]> = [
        ["9/11 meeting", "2021-9-11", "meeting"],
        ["meeting 9/11", "2021-9-11", "meeting"],
        ["meeting 9/11 at 10:00", "2021-9-11", "meeting"],
        ["meeting 9/11 @ 15:00", "2021-9-11", "meeting"],
        ["2021-06-24 Lorem Ipsum", "2021-6-24", "Lorem Ipsum"],
        ["Lorem Ipsum 06/26/2021", "2021-6-26", "Lorem Ipsum"],
        ["01.02 Lorem Ipsum", "2022-2-1", "Lorem Ipsum"],
        ["Lorem Ipsum 01.02", "2022-2-1", "Lorem Ipsum"],
        ["The 9/11 Report due 10/12", "2021-10-12", "The 9/11 Report due"],
      ];

      cases.forEach(([input, dateStr, text]) => {
        it(`should parse a date from '${input}'`, () => {
          const result = parseTaskText(
            input,
            PrefixMode.Default,
            new Date(now),
          );
          expect(result.text.trim()).toBe(text);
          const d = result.date;
          expect(d).not.toBeNull();
          expect(
            `${d?.getFullYear()}-${(d?.getMonth() ?? 0) + 1}-${d?.getDate()}`,
          ).toBe(dateStr);
        });
      });
    });

    describe("should not produce false positives", () => {
      const cases = [
        "The 9/11 Report",
        "The 01/02 Report",
        "The 1.2 formula",
        "Lorem Ipsum renewed",
        "Lorem Ipsum github",
        "fix monitor stand",
        "order wedding cake",
        "investigate thumping noise",
        "take photo of saturn",
        "monitor blood pressure",
        "buy almonds",
        "Renovation - 2nd Floor Bath",
        "Remark - 13th floor",
        "Lorem Ispum v1.1.1",
        "https://some-url.org/blog/2019/1/233526-some-more-text",
      ];

      cases.forEach((c) => {
        it(`should not parse a date from '${c}'`, () => {
          const result = parseTaskText(c);
          expect(result.text).toBe(c);
          expect(result.date).toBeNull();
        });
      });
    });

    describe("relative 'in N <unit>'", () => {
      const now = new Date();
      now.setFullYear(2021, 5, 24);
      now.setHours(12, 0, 0, 0);

      const cases: Record<string, string> = {
        "Lorem Ipsum in 1 hour": "2021-6-24 13:0",
        "Lorem Ipsum in 2 hours": "2021-6-24 14:0",
        "Lorem Ipsum in 1 day": "2021-6-25 12:0",
        "Lorem Ipsum in 2 weeks": "2021-7-8 12:0",
        "Lorem Ipsum in 3 months": "2021-9-24 12:0",
      };

      for (const c of Object.keys(cases)) {
        it(`should parse '${c}'`, () => {
          const { date } = parseTaskText(c, PrefixMode.Default, new Date(now));
          expect(
            `${date?.getFullYear()}-${(date?.getMonth() ?? 0) + 1}-${date?.getDate()} ${date?.getHours()}:${date?.getMinutes()}`,
          ).toBe(cases[c]);
        });
      }
    });

    describe("weekdays", () => {
      const days: Record<string, number> = {
        monday: 1,
        mon: 1,
        tuesday: 2,
        tue: 2,
        wednesday: 3,
        wed: 3,
        thursday: 4,
        thu: 4,
        friday: 5,
        fri: 5,
        saturday: 6,
        sat: 6,
        sunday: 0,
        sun: 0,
      };

      for (const d of Object.keys(days)) {
        it(`should recognize ${d}`, () => {
          const result = parseTaskText(`Lorem Ipsum ${d}`);
          const next = new Date();
          next.setDate(next.getDate() + ((days[d] + 7 - next.getDay()) % 7));
          expect(result.text).toBe("Lorem Ipsum");
          expect(result.date?.getDate()).toBe(next.getDate());
        });

        it(`should not recognize ${d} embedded in a word`, () => {
          const text = `Lorem Ipsum lorem${d}ipsum`;
          const result = parseTaskText(text);
          expect(result.text).toBe(text);
          expect(result.date).toBeNull();
        });
      }
    });
  });

  describe("Labels", () => {
    it("should parse labels", () => {
      const result = parseTaskText("Lorem Ipsum *label1 *label2");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.labels).toEqual(["label1", "label2"]);
    });

    it("should parse labels from the start", () => {
      const result = parseTaskText("*label1 Lorem Ipsum *label2");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.labels).toEqual(["label1", "label2"]);
    });

    it("should resolve duplicate labels", () => {
      const result = parseTaskText("Lorem Ipsum *label1 *label1 *label2");
      expect(result.labels).toEqual(["label1", "label2"]);
    });

    it("should parse labels with spaces using single quotes", () => {
      const result = parseTaskText("Lorem *'label with space' Ipsum");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.labels).toEqual(["label with space"]);
    });

    it("should parse labels with spaces using double quotes", () => {
      const result = parseTaskText('Lorem *"label with space" Ipsum');
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.labels).toEqual(["label with space"]);
    });

    it("should parse labels with parentheses", () => {
      const result = parseTaskText('a *"a (a)"');
      expect(result.text).toBe("a");
      expect(result.labels).toEqual(["a (a)"]);
    });

    it("should not treat a label named like a date as a date", () => {
      const result = parseTaskText("Lorem Ipsum *today");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.labels).toEqual(["today"]);
      expect(result.date).toBeNull();
    });
  });

  describe("Project", () => {
    it("should parse a project", () => {
      const result = parseTaskText("Lorem Ipsum +project");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.project).toBe("project");
    });

    it("should parse a project with a space using single quotes", () => {
      const result = parseTaskText("Lorem Ipsum +'project with long name'");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.project).toBe("project with long name");
    });

    it("should parse a project with a space using double quotes", () => {
      const result = parseTaskText('Lorem Ipsum +"project with long name"');
      expect(result.project).toBe("project with long name");
    });

    it("should only parse the first project", () => {
      const result = parseTaskText("Lorem Ipsum +project1 +project2 +project3");
      expect(result.text).toBe("Lorem Ipsum +project2 +project3");
      expect(result.project).toBe("project1");
    });

    it("should treat a project named like a date as a project", () => {
      const result = parseTaskText("Lorem Ipsum +today");
      expect(result.text).toBe("Lorem Ipsum");
      expect(result.project).toBe("today");
    });
  });

  describe("Priority", () => {
    for (const p of [0, 1, 2, 3, 4, 5] as const) {
      it(`should parse priority ${p}`, () => {
        const result = parseTaskText(`Lorem Ipsum !${p}`);
        expect(result.text).toBe("Lorem Ipsum");
        expect(result.priority).toBe(p);
      });
    }

    it("should not parse an invalid priority", () => {
      const result = parseTaskText("Lorem Ipsum !9999");
      expect(result.text).toBe("Lorem Ipsum !9999");
      expect(result.priority).toBeNull();
    });

    it("should use the first valid priority it finds", () => {
      const result = parseTaskText("Lorem Ipsum !9999 !1");
      expect(result.text).toBe("Lorem Ipsum !9999");
      expect(result.priority).toBe(1);
    });
  });

  describe("Assignee", () => {
    it("should parse an assignee", () => {
      const result = parseTaskText("Lorem Ipsum @user");
      expect(result.assignees).toEqual(["user"]);
    });

    it("should not strip assignees from text", () => {
      const text = "Lorem Ipsum @user";
      expect(parseTaskText(text).text).toBe(text);
    });

    it("should parse multiple assignees", () => {
      const result = parseTaskText("Lorem Ipsum @user1 @user2 @user3");
      expect(result.assignees).toEqual(["user1", "user2", "user3"]);
    });

    it("should avoid duplicate assignees", () => {
      const result = parseTaskText("Lorem Ipsum @user1 @user1 @user2");
      expect(result.assignees).toEqual(["user1", "user2"]);
    });

    it("should parse an assignee with a space in it", () => {
      const result = parseTaskText("Lorem Ipsum @'user with long name'");
      expect(result.assignees).toEqual(["user with long name"]);
    });

    it("should recognize an email address as assignee", () => {
      const result = parseTaskText("Lorem Ipsum @email@example.com");
      expect(result.assignees).toEqual(["email@example.com"]);
    });
  });

  describe("Recurring Dates", () => {
    const cases: Record<string, { type: string; amount: number }> = {
      "every 1 hour": { type: "hours", amount: 1 },
      "every hour": { type: "hours", amount: 1 },
      "every 5 hours": { type: "hours", amount: 5 },
      "every 12 hours": { type: "hours", amount: 12 },
      "every day": { type: "days", amount: 1 },
      "every 2 days": { type: "days", amount: 2 },
      "every week": { type: "weeks", amount: 1 },
      "every 3 weeks": { type: "weeks", amount: 3 },
      "every month": { type: "months", amount: 1 },
      "every 2 months": { type: "months", amount: 2 },
      "every year": { type: "years", amount: 1 },
      "every 4 years": { type: "years", amount: 4 },
      "every two hours": { type: "hours", amount: 2 },
      "every three hours": { type: "hours", amount: 3 },
      "every ten hours": { type: "hours", amount: 10 },
      annually: { type: "years", amount: 1 },
      biannually: { type: "months", amount: 6 },
      semiannually: { type: "months", amount: 6 },
      biennially: { type: "years", amount: 2 },
      daily: { type: "days", amount: 1 },
      hourly: { type: "hours", amount: 1 },
      monthly: { type: "months", amount: 1 },
      weekly: { type: "weeks", amount: 1 },
      yearly: { type: "years", amount: 1 },
    };

    for (const c of Object.keys(cases)) {
      it(`should parse '${c}'`, () => {
        const result = parseTaskText(`Lorem Ipsum ${c}`);
        expect(result.text).toBe("Lorem Ipsum");
        expect(result.repeats?.type).toBe(cases[c].type);
        expect(result.repeats?.amount).toBe(cases[c].amount);
      });

      it(`should parse '${c}' together with a time`, () => {
        const result = parseTaskText(`Lorem Ipsum ${c} at 11:42`);
        expect(result.text).toBe("Lorem Ipsum");
        expect(result.repeats?.type).toBe(cases[c].type);
        expect(result.repeats?.amount).toBe(cases[c].amount);
        expect(`${result.date?.getHours()}:${result.date?.getMinutes()}`).toBe(
          "11:42",
        );
      });
    }

    ["annually", "daily", "hourly", "monthly", "weekly", "yearly"].forEach(
      (c) => {
        it(`should ignore '${c}' when part of a word`, () => {
          const result = parseTaskText(`Lorem Ipsum word${c}notword`);
          expect(result.text).toBe(`Lorem Ipsum word${c}notword`);
          expect(result.repeats).toBeNull();
        });
      },
    );
  });

  describe("Combined intents", () => {
    it("should parse all intents from one string", () => {
      const result = parseTaskText(
        "Buy milk today *shopping +Groceries !3 @alice every week",
      );
      expect(result.text).toBe("Buy milk  @alice");
      expect(result.labels).toEqual(["shopping"]);
      expect(result.project).toBe("Groceries");
      expect(result.priority).toBe(3);
      expect(result.assignees).toEqual(["alice"]);
      expect(result.repeats?.type).toBe("weeks");
      expect(result.repeats?.amount).toBe(1);
      expect(result.date).not.toBeNull();
    });
  });
});
