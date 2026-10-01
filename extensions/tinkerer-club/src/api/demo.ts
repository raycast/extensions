import { FetchAdapter } from "./client";
import { JsonObject, JsonValue } from "../types/api";

// All identities and writing in this file are fictional. The adapter never calls fetch.
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const avatar = (seed: string) => `https://api.dicebear.com/9.x/identicon/svg?seed=tinkerer-demo-${seed}`;

const members = {
  maya: { id: "demo-maya", name: "Maya Chen", username: "maya-makes-demo", avatarUrl: avatar("maya") },
  leo: { id: "demo-leo", name: "Leo Rivera", username: "leo-builds-demo", avatarUrl: avatar("leo") },
  nia: { id: "demo-nia", name: "Nia Patel", username: "nia-labs-demo", avatarUrl: avatar("nia") },
  finn: { id: "demo-finn", name: "Finn Walker", username: "finn-codes-demo", avatarUrl: avatar("finn") },
  iris: { id: "demo-iris", name: "Iris Okafor", username: "iris-designs-demo", avatarUrl: avatar("iris") },
  sam: { id: "demo-sam", name: "Sam Brooks", username: "sam-ships-demo", avatarUrl: avatar("sam") },
};

const articles: JsonObject[] = [
  {
    id: "demo-article-1",
    type: "ARTICLE",
    title: "A weekend prototype that became a daily tool",
    contentPreview: "How a tiny automation grew into a reliable part of my workflow.",
    content:
      "I started with one annoying manual step: copying notes between two tools. A small script solved it in an afternoon. The interesting work came later: logging, clear failure messages, and making it easy to turn off.\n\nThe lesson was to keep the first version narrow and make the second version dependable.",
    author: members.maya,
    topics: ["Automation", "Indie Making"],
    readingTimeMinutes: 4,
    publishedAt: hoursAgo(14),
  },
  {
    id: "demo-article-2",
    type: "ARTICLE",
    title: "What I learned shipping my first hardware project",
    contentPreview: "Enclosures, tolerances, and the little details I missed on the first pass.",
    content:
      "The circuit worked on a breadboard. Turning it into something another person could assemble was a different challenge. I made room for cable routing, labeled every connector, and tested the enclosure with a paper print before ordering another prototype.",
    author: members.leo,
    topics: ["Hardware", "Making"],
    readingTimeMinutes: 6,
    publishedAt: hoursAgo(37),
  },
  {
    id: "demo-article-3",
    type: "ARTICLE",
    title: "A calmer approach to personal dashboards",
    contentPreview: "Show what changed, hide what hasn't, and make the next action obvious.",
    content:
      "My old dashboard showed every metric all the time. The new one starts with exceptions and recent changes. Fewer numbers made it easier to notice what actually needed attention.",
    author: members.iris,
    topics: ["Design", "Productivity"],
    readingTimeMinutes: 3,
    publishedAt: hoursAgo(62),
  },
  {
    id: "demo-article-4",
    type: "ARTICLE",
    title: "Building a useful search before adding AI",
    contentPreview: "Good labels and predictable filters solved more than an elaborate prompt.",
    content:
      "I tested search with a dozen real questions from my own notes. The biggest gains came from consistent titles and better result previews. Only after those basics worked did I add an AI summary.",
    author: members.nia,
    topics: ["AI & LLMs", "Developer Tools"],
    readingTimeMinutes: 5,
    publishedAt: hoursAgo(91),
  },
  {
    id: "demo-article-5",
    type: "ARTICLE",
    title: "The tiny release checklist I actually use",
    contentPreview: "A short checklist for shipping without turning every launch into a ceremony.",
    content:
      "I check the happy path, the empty state, one failure case, the README, and the rollback path. Keeping the list small means I use it every time.",
    author: members.sam,
    topics: ["Shipping", "Developer Tools"],
    readingTimeMinutes: 3,
    publishedAt: hoursAgo(130),
  },
].map((item) => ({ ...item, isDemo: true }));

const posts: JsonObject[] = [
  {
    id: "demo-post-1",
    type: "SHORT",
    content:
      "Just shipped a tiny menu-bar tool for my workshop. It shows the one machine that needs attention instead of a wall of status lights. What do you keep in your menu bar?",
    author: members.maya,
    topics: ["Automation", "macOS"],
    publishedAt: hoursAgo(1),
    commentCount: 3,
    reactions: [
      { emoji: "🔥", count: 5 },
      { emoji: "👏", count: 2 },
    ],
  },
  {
    id: "demo-post-2",
    type: "SHORT",
    content:
      "I finally got the enclosure fit right on my desk sensor. Version one needed tape; version four clicks together. Small win, very satisfying. 🛠️",
    author: members.leo,
    topics: ["Hardware", "3D Printing"],
    publishedAt: hoursAgo(3),
    commentCount: 2,
    reactions: [
      { emoji: "🎉", count: 6 },
      { emoji: "❤️", count: 2 },
    ],
  },
  {
    id: "demo-post-3",
    type: "SHORT",
    content:
      "Question for the club: what's your favorite way to keep project notes searchable without spending all day organizing them?",
    author: members.nia,
    topics: ["Productivity", "Developer Tools"],
    publishedAt: hoursAgo(5),
    commentCount: 4,
    reactions: [{ emoji: "💡", count: 4 }],
  },
  {
    id: "demo-post-4",
    type: "SHORT",
    content:
      "Today's build log: replaced a fragile spreadsheet with a simple dashboard. Fewer columns, better decisions.",
    author: members.iris,
    topics: ["Design", "Building"],
    publishedAt: hoursAgo(8),
    commentCount: 1,
    reactions: [{ emoji: "👏", count: 7 }],
  },
  articles[0]!,
  {
    id: "demo-post-5",
    type: "MEMBER_JOINED",
    author: members.finn,
    publishedAt: hoursAgo(19),
    commentCount: 0,
    reactions: [{ emoji: "👋", count: 5 }],
  },
  {
    id: "demo-post-6",
    type: "SHORT",
    content:
      "I gave myself one hour to improve an open-source README. Added a quick-start example and three screenshots. It was the most useful hour I spent on the project this week.",
    author: members.sam,
    topics: ["Open Source", "Shipping"],
    publishedAt: hoursAgo(22),
    commentCount: 2,
    reactions: [{ emoji: "✨", count: 8 }],
  },
  articles[1]!,
  articles[2]!,
  articles[3]!,
  {
    id: "demo-post-7",
    type: "MEMBER_JOINED",
    author: members.iris,
    publishedAt: hoursAgo(72),
    commentCount: 0,
    reactions: [{ emoji: "👋", count: 3 }],
  },
  articles[4]!,
];

const comments: Record<string, JsonObject[]> = {
  "demo-post-1": [
    {
      id: "demo-comment-1",
      author: members.finn,
      content: "I keep my build timer there. One glance tells me whether it's time to take a break.",
      createdAt: hoursAgo(0.7),
      reactions: [{ emoji: "👍", count: 3 }],
    },
    {
      id: "demo-comment-2",
      author: members.iris,
      content: "Love the focus on one useful signal. Do you have a screenshot of the compact view?",
      createdAt: hoursAgo(0.5),
      reactions: [{ emoji: "💚", count: 2 }],
    },
    {
      id: "demo-comment-3",
      author: members.maya,
      parentId: "demo-comment-2",
      content: "Yes! I added it to the project notes. The whole view is just an icon and a number.",
      createdAt: hoursAgo(0.3),
    },
  ],
  "demo-post-2": [
    {
      id: "demo-comment-4",
      author: members.sam,
      content: "The click-fit moment is the best part of prototyping. Nice work!",
      createdAt: hoursAgo(2.5),
      reactions: [{ emoji: "🙌", count: 2 }],
    },
    {
      id: "demo-comment-5",
      author: members.leo,
      content: "Thanks! The trick was giving the clips a little more clearance.",
      createdAt: hoursAgo(2.2),
    },
  ],
  "demo-post-3": [
    {
      id: "demo-comment-6",
      author: members.maya,
      content: "I write plain Markdown and put the project name in the filename. Boring, but it works.",
      createdAt: hoursAgo(4.6),
      reactions: [{ emoji: "👍", count: 4 }],
    },
    {
      id: "demo-comment-7",
      author: members.finn,
      content: "Same here, plus a short index page for active projects.",
      createdAt: hoursAgo(4.1),
    },
    {
      id: "demo-comment-8",
      author: members.iris,
      content: "A good search box beats a complicated folder hierarchy for me.",
      createdAt: hoursAgo(3.8),
    },
    {
      id: "demo-comment-9",
      author: members.nia,
      content: "These are exactly the low-maintenance ideas I was hoping for. Thank you!",
      createdAt: hoursAgo(3.5),
    },
  ],
  "demo-post-4": [
    {
      id: "demo-comment-10",
      author: members.leo,
      content: "Showing only what's changed sounds great. I'm trying that on my own dashboard.",
      createdAt: hoursAgo(7),
    },
  ],
  "demo-post-6": [
    {
      id: "demo-comment-11",
      author: members.nia,
      content: "Quick-start examples make such a difference. I wish more projects led with one.",
      createdAt: hoursAgo(20),
    },
    {
      id: "demo-comment-12",
      author: members.sam,
      content: "Agreed. I moved mine to the top after watching a friend try the install.",
      createdAt: hoursAgo(18),
    },
  ],
};

const prompts: JsonObject[] = [
  {
    id: "demo-prompt-1",
    title: "Turn rough notes into a project plan",
    kind: "TEXT",
    author: members.nia,
    description: "Find the next small, testable step in a messy idea.",
    content:
      "Turn the notes below into a concise project plan. Identify the goal, three smallest milestones, the first test, and any unresolved questions. Do not invent missing requirements.\n\nNotes: {{notes}}",
    tags: ["Planning", "Building"],
    saved: true,
  },
  {
    id: "demo-prompt-2",
    title: "A thoughtful code review",
    kind: "TEXT",
    author: members.finn,
    description: "Review a change for correctness, clarity, and risk.",
    content:
      "Review this diff. Start with concrete bugs and regressions, then note maintainability concerns. Cite the exact lines and explain how to reproduce each issue. If you find nothing, say so.\n\n{{diff}}",
    tags: ["Developer Tools", "Code"],
  },
  {
    id: "demo-prompt-3",
    title: "Explain a concept with one example",
    kind: "TEXT",
    author: members.maya,
    description: "A reusable learning prompt without the jargon.",
    content:
      "Explain {{concept}} in plain language. Give one real-world analogy, one small worked example, and one common misconception. Keep it under 300 words.",
    tags: ["Learning"],
  },
  {
    id: "demo-prompt-4",
    title: "Sketch a useful dashboard",
    kind: "TEXT",
    author: members.iris,
    description: "Decide what belongs on the first screen.",
    content:
      "Given this user's goal and available data, suggest a dashboard. Prioritize changes and actionable exceptions over vanity metrics. Explain what to hide until a user asks.\n\nGoal: {{goal}}\nData: {{data}}",
    tags: ["Design", "Productivity"],
  },
  {
    id: "demo-prompt-5",
    title: "Release note from a changelog",
    kind: "TEXT",
    author: members.sam,
    description: "Write a clear update people can scan.",
    content:
      "Turn this changelog into a short release note. Lead with the user benefit, include only material changes, and avoid hype.\n\n{{changelog}}",
    tags: ["Shipping"],
  },
  {
    id: "demo-prompt-6",
    title: "Find the smallest prototype",
    kind: "VIBE_COMMAND",
    author: members.leo,
    description: "Cut a big hardware or software idea down to a weekend test.",
    content:
      "Given {{idea}}, propose the smallest prototype that answers the riskiest question. Include materials, a two-day schedule, and a clear stop condition.",
    tags: ["Prototyping", "Making"],
  },
];

const topics: JsonObject[] = [
  { slug: "automation", name: "Automation" },
  { slug: "hardware", name: "Hardware" },
  { slug: "design", name: "Design" },
  { slug: "shipping", name: "Shipping" },
  { slug: "developer-tools", name: "Developer Tools" },
];

function text(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function matches(item: JsonObject, query: string): boolean {
  if (!query) return true;
  return [
    item.title,
    item.name,
    item.username,
    item.content,
    item.contentPreview,
    item.description,
    JSON.stringify(item.author),
    JSON.stringify(item.topics),
    JSON.stringify(item.tags),
  ].some((value) => typeof value === "string" && value.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
}

function demoResult(path: string, input: JsonObject): JsonValue {
  const query = text(input.query).trim();
  switch (path) {
    case "post.timeline":
      return { items: posts.slice(0, typeof input.limit === "number" ? input.limit : 40) };
    case "post.articleDirectoryPage":
      return { items: articles.filter((item) => matches(item, query)) };
    case "post.myDrafts":
      return { items: [] };
    case "post.byId":
      return posts.find((post) => post.id === input.id) ?? { error: "Demo post not found" };
    case "post.listComments":
      return { items: comments[text(input.postId)] ?? [] };
    case "prompt.list": {
      const view = text(input.view);
      const visible = prompts.filter(
        (item) =>
          matches(item, query) &&
          (view !== "SAVED" || item.saved === true) &&
          (view !== "MINE" || (item.author as JsonObject).id === members.maya.id),
      );
      return { items: visible };
    }
    case "prompt.byId":
      return prompts.find((prompt) => prompt.id === input.id) ?? { error: "Demo prompt not found" };
    case "topic.list":
      return { items: topics };
    case "search.all":
      return {
        items: [...posts, ...prompts, ...Object.values(members)]
          .filter((item) => matches(item, query))
          .map((item: JsonObject) =>
            item.type === "SHORT" && typeof item.content === "string"
              ? { ...item, title: `${item.content.slice(0, 70)}${item.content.length > 70 ? "…" : ""}` }
              : item,
          )
          .slice(0, 25),
      };
    case "post.addComment": {
      const postId = text(input.postId);
      const post = posts.find((item) => item.id === postId);
      if (!post) throw new Error("Demo post not found");
      const comment = {
        id: `demo-comment-${Date.now()}`,
        author: { id: "demo-you", name: "You (Demo)", username: "demo-user" },
        content: text(input.content),
        createdAt: new Date().toISOString(),
        ...(input.parentId ? { parentId: input.parentId } : {}),
      };
      (comments[postId] ??= []).push(comment);
      post.commentCount = comments[postId].length;
      return comment;
    }
    case "post.like":
    case "post.unlike": {
      const post = posts.find((item) => item.id === input.postId);
      if (!post) throw new Error("Demo post not found");
      const before = typeof post.viewerReaction === "string" ? post.viewerReaction : undefined;
      const after = path === "post.like" ? text(input.reaction) : undefined;
      post.viewerReaction = after ?? null;
      const existingCount = Array.isArray(post.reactions)
        ? post.reactions.reduce<number>(
            (sum, item) =>
              sum +
              (typeof item === "object" && item !== null && !Array.isArray(item) && typeof item.count === "number"
                ? item.count
                : 0),
            0,
          )
        : 0;
      post.reactionCount = Math.max(
        0,
        Number(post.reactionCount ?? existingCount) +
          Number(Boolean(after) && !before) -
          Number(!after && Boolean(before)),
      );
      return { success: true, viewerReaction: after ?? null };
    }
    case "post.reactToComment":
    case "post.removeCommentReaction": {
      const comment = Object.values(comments)
        .flat()
        .find((item) => item.id === input.commentId);
      if (!comment) throw new Error("Demo comment not found");
      comment.viewerReaction = path === "post.reactToComment" ? text(input.reaction) : null;
      return { success: true };
    }
    case "prompt.toggleSave": {
      const prompt = prompts.find((item) => item.id === input.promptId);
      if (!prompt) throw new Error("Demo prompt not found");
      prompt.saved = !prompt.saved;
      return { success: true, saved: prompt.saved };
    }
    default:
      throw new Error(`Demo mode has no fixture for ${path}. No live request was sent.`);
  }
}

export const demoFetch: FetchAdapter = async (request, init) => {
  if (init?.signal?.aborted) throw new Error("The request was cancelled.");
  const url = new URL(String(request));
  const segments = url.pathname.split("/").filter(Boolean);
  const path = segments.length >= 4 ? `${segments[2]}.${segments[3]}` : "";
  if (!path) return Response.json({ error: "The live API catalog is unavailable in demo mode." }, { status: 404 });
  try {
    const parsed: unknown = init?.body ? JSON.parse(String(init.body)) : {};
    const input = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonObject) : {};
    return Response.json(demoResult(path, input));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Demo request failed" }, { status: 400 });
  }
};
