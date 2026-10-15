import { describe, expect, it } from "vitest";

import { chatToMarkdown, chatToPlainText, mentionNames, mentionsUser, truncate } from "../src/helpers/chat-format";

describe("chatToMarkdown", () => {
  it("converts bold and strikethrough, keeps italic", () => {
    expect(chatToMarkdown("*bold* _italic_ ~gone~")).toBe("**bold** _italic_ ~~gone~~");
  });

  it("leaves markers inside words and bullet stars alone", () => {
    expect(chatToMarkdown("snake_case_name and 2*3*4")).toBe("snake_case_name and 2*3*4");
    expect(chatToMarkdown("* item one\n* item two")).toBe("* item one  \n* item two");
  });

  it("does not format inside inline code or code blocks", () => {
    expect(chatToMarkdown("run `rm *.tmp* now`")).toBe("run `rm *.tmp* now`");
    expect(chatToMarkdown("```const a = *b*;```")).toBe("```\nconst a = *b*;\n```");
    expect(chatToMarkdown("before\n```\nx = ~y~\n```\nafter")).toContain("```\nx = ~y~\n```");
  });

  it("renders mentions with known names", () => {
    expect(chatToMarkdown("hi <users/123> and <users/all>", { "users/123": "Sara Khan" })).toBe(
      "hi **@Sara Khan** and **@all**",
    );
    expect(chatToMarkdown("ping <users/999>")).toBe("ping **@unknown**");
  });

  it("renders labelled and bare links without mangling underscores", () => {
    expect(chatToMarkdown("see <https://example.com/a_b_c|the doc>")).toBe("see [the doc](https://example.com/a_b_c)");
    expect(chatToMarkdown("<https://example.com/x>")).toBe("<https://example.com/x>");
    expect(chatToMarkdown("go to https://example.com/_x_/*y* now")).toBe("go to https://example.com/_x_/*y* now");
  });

  it("escapes brackets in link labels and handles empty input", () => {
    expect(chatToMarkdown("<https://e.com|a [b]>")).toBe("[a \\[b\\]](https://e.com)");
    expect(chatToMarkdown(undefined)).toBe("");
  });
});

describe("chatToPlainText", () => {
  it("strips formatting for one-line snippets", () => {
    expect(
      chatToPlainText("*Deploy* _today_\n~maybe~ `npm run build` <https://x.io|link> <users/1>", { "users/1": "Ali" }),
    ).toBe("Deploy today maybe npm run build link @Ali");
  });
});

describe("mentions", () => {
  const message = {
    annotations: [
      {
        type: "USER_MENTION" as const,
        userMention: { user: { name: "users/1", displayName: "Ali" }, type: "MENTION" as const },
      },
      { type: "RICH_LINK" as const },
    ],
  };

  it("collects mention display names", () => {
    expect(mentionNames(message, { "users/2": "Sara" })).toEqual({ "users/1": "Ali", "users/2": "Sara" });
  });

  it("detects mentions of a user or @all", () => {
    expect(mentionsUser(message, "users/1")).toBe(true);
    expect(mentionsUser(message, "users/2")).toBe(false);
    expect(
      mentionsUser(
        { annotations: [{ type: "USER_MENTION", userMention: { user: { name: "users/all" } } }] },
        "users/2",
      ),
    ).toBe(true);
    expect(
      mentionsUser({ annotations: [{ type: "USER_MENTION", userMention: { user: { name: "users/me" } } }] }, undefined),
    ).toBe(true);
  });
});

describe("truncate", () => {
  it("adds an ellipsis only when needed", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("a long sentence here", 10)).toBe("a long se…");
  });
});
