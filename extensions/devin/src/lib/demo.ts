import { CreateSessionInput, CreateSessionResult, DevinClient, SessionDetail, SessionListResult } from "../types";

type DemoSessionRecord = SessionDetail;

const DEMO_USER_EMAIL = "anthony@example.com";
const DEMO_APP_BASE_URL = "https://example.com/devin";

let demoSessions = createInitialDemoSessions();

function isoMinutesAgo(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

function buildSessionUrl(sessionId: string): string {
  return `${DEMO_APP_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`;
}

function buildPullRequestUrl(path: string): string {
  return `https://example.com${path}`;
}

function createInitialDemoSessions(): DemoSessionRecord[] {
  return [
    {
      id: "devin-demo-checkout-redesign",
      title: "Revamp checkout success page for spring campaign",
      status: "working",
      statusLabel: "Working",
      createdAt: isoMinutesAgo(320),
      updatedAt: isoMinutesAgo(8),
      playbookId: "playbook-growth-ui",
      snapshotId: "snapshot-2026-03-growth",
      requestingUserEmail: DEMO_USER_EMAIL,
      pullRequestUrl: buildPullRequestUrl("/acme/shop-web/pull/4821"),
      structuredOutput: {
        branch: "demo/checkout-success-refresh",
        nextMilestone: "QA handoff",
        risk: "Low",
      },
      tags: ["frontend", "growth", "priority"],
      url: buildSessionUrl("devin-demo-checkout-redesign"),
      messages: [
        {
          author: DEMO_USER_EMAIL,
          body: "Refresh the checkout success state so marketing can use it in screenshots and the spring launch.",
          createdAt: isoMinutesAgo(320),
        },
        {
          author: "Devin",
          body: "I audited the current flow and found the main friction point in the confirmation hero and CTA hierarchy.",
          createdAt: isoMinutesAgo(287),
        },
        {
          author: "Devin",
          body: "I mocked an updated hero, tightened the summary card layout, and staged copy that avoids real customer names.",
          createdAt: isoMinutesAgo(42),
        },
      ],
    },
    {
      id: "devin-demo-release-train",
      title: "Prepare release notes and QA checklist for 2.4",
      status: "finished",
      statusLabel: "Finished",
      createdAt: isoMinutesAgo(1400),
      updatedAt: isoMinutesAgo(73),
      playbookId: "playbook-release-ops",
      requestingUserEmail: DEMO_USER_EMAIL,
      pullRequestUrl: buildPullRequestUrl("/acme/platform/pull/4798"),
      structuredOutput: {
        checklistComplete: true,
        releaseVersion: "2.4.0",
      },
      tags: ["release", "docs"],
      url: buildSessionUrl("devin-demo-release-train"),
      messages: [
        {
          author: DEMO_USER_EMAIL,
          body: "Draft release notes and give me a QA checklist for launch day.",
          createdAt: isoMinutesAgo(1400),
        },
        {
          author: "Devin",
          body: "Done. I grouped user-facing changes, internal fixes, and rollout caveats into a launch-ready summary.",
          createdAt: isoMinutesAgo(1350),
        },
      ],
    },
    {
      id: "devin-demo-api-hardening",
      title: "Investigate intermittent 502s on webhook delivery",
      status: "blocked",
      statusLabel: "Blocked",
      createdAt: isoMinutesAgo(960),
      updatedAt: isoMinutesAgo(19),
      snapshotId: "snapshot-api-prod-mirror",
      requestingUserEmail: "platform@example.com",
      structuredOutput: {
        blocker: "Need access to the gateway logs from staging mirror",
      },
      tags: ["backend", "incident"],
      url: buildSessionUrl("devin-demo-api-hardening"),
      messages: [
        {
          author: "platform@example.com",
          body: "Track down the 502 spike from last night and propose a mitigation.",
          createdAt: isoMinutesAgo(960),
        },
        {
          author: "Devin",
          body: "I narrowed the issue to retries piling up behind a degraded upstream, but I need the mirrored gateway logs to confirm.",
          createdAt: isoMinutesAgo(19),
        },
      ],
    },
    {
      id: "devin-demo-mobile-polish",
      title: "Polish onboarding empty states for mobile web",
      status: "resumed",
      statusLabel: "Resumed",
      createdAt: isoMinutesAgo(610),
      updatedAt: isoMinutesAgo(27),
      playbookId: "playbook-mobile-growth",
      requestingUserEmail: "design@example.com",
      pullRequestUrl: buildPullRequestUrl("/acme/mobile-web/pull/4813"),
      tags: ["mobile", "ux"],
      url: buildSessionUrl("devin-demo-mobile-polish"),
      messages: [
        {
          author: "design@example.com",
          body: "Tighten the empty states and improve the hierarchy for the mobile onboarding flow.",
          createdAt: isoMinutesAgo(610),
        },
        {
          author: "Devin",
          body: "I resumed the exploration and updated spacing, icon treatment, and copy length for narrow screens.",
          createdAt: isoMinutesAgo(27),
        },
      ],
    },
  ];
}

function cloneDemoSession(session: DemoSessionRecord): DemoSessionRecord {
  return {
    ...session,
    tags: [...session.tags],
    messages: session.messages.map((message) => ({ ...message })),
    structuredOutput:
      session.structuredOutput && typeof session.structuredOutput === "object"
        ? JSON.parse(JSON.stringify(session.structuredOutput))
        : session.structuredOutput,
  };
}

function getDemoSessions(): DemoSessionRecord[] {
  return demoSessions.map(cloneDemoSession);
}

function toSessionSummary(session: DemoSessionRecord) {
  return {
    id: session.id,
    title: session.title,
    status: session.status,
    statusLabel: session.statusLabel,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    playbookId: session.playbookId,
    snapshotId: session.snapshotId,
    requestingUserEmail: session.requestingUserEmail,
    pullRequestUrl: session.pullRequestUrl,
    structuredOutput: session.structuredOutput,
    tags: [...session.tags],
    url: session.url,
  };
}

function updateDemoSession(sessionId: string, update: (session: DemoSessionRecord) => DemoSessionRecord): void {
  demoSessions = demoSessions.map((session) => (session.id === sessionId ? update(session) : session));
}

function buildCreatedDemoSession(input: CreateSessionInput): DemoSessionRecord {
  const createdAt = new Date().toISOString();
  const id = `devin-demo-${Date.now()}`;
  const title = input.title?.trim() || input.prompt.trim().slice(0, 64) || "New demo session";

  return {
    id,
    title,
    status: "working",
    statusLabel: "Working",
    createdAt,
    updatedAt: createdAt,
    playbookId: input.playbookId,
    snapshotId: input.snapshotId,
    requestingUserEmail: DEMO_USER_EMAIL,
    pullRequestUrl: buildPullRequestUrl("/acme/demo/pull/4901"),
    structuredOutput: {
      mode: "demo",
      note: "Generated locally for screenshots",
    },
    tags: input.tags ?? [],
    url: buildSessionUrl(id),
    messages: [
      {
        author: DEMO_USER_EMAIL,
        body: input.prompt.trim(),
        createdAt,
      },
      {
        author: "Devin",
        body: "Demo mode is enabled. I created a sample session record for screenshots without contacting the Devin API.",
        createdAt,
      },
    ],
  };
}

class DemoDevinClient implements DevinClient {
  async listSessions(input: {
    limit?: number;
    offset?: number;
    tags?: string[];
    userEmail?: string;
  }): Promise<SessionListResult> {
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const requestedTags = input.tags?.map((tag) => tag.toLowerCase()) ?? [];
    const requestedEmail = input.userEmail?.trim().toLowerCase();

    const filtered = getDemoSessions().filter((session) => {
      if (requestedEmail && session.requestingUserEmail?.toLowerCase() !== requestedEmail) {
        return false;
      }

      if (!requestedTags.length) {
        return true;
      }

      const sessionTags = session.tags.map((tag) => tag.toLowerCase());
      return requestedTags.every((tag) => sessionTags.includes(tag));
    });

    const sessions = filtered.slice(offset, offset + limit).map(toSessionSummary);

    return {
      sessions,
      hasMore: offset + sessions.length < filtered.length,
      nextOffset: offset + sessions.length,
    };
  }

  async getSession(sessionId: string): Promise<SessionDetail> {
    const session = getDemoSessions().find((candidate) => candidate.id === sessionId);
    if (!session) {
      throw new Error(`Demo session not found: ${sessionId}`);
    }

    return session;
  }

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const session = buildCreatedDemoSession(input);
    demoSessions = [session, ...demoSessions];

    return {
      id: session.id,
      url: session.url,
      isNewSession: true,
    };
  }

  async sendMessage(sessionId: string, message: string): Promise<string> {
    const trimmedMessage = message.trim();
    const timestamp = new Date().toISOString();

    updateDemoSession(sessionId, (session) => ({
      ...session,
      updatedAt: timestamp,
      messages: [
        ...session.messages,
        {
          author: DEMO_USER_EMAIL,
          body: trimmedMessage,
          createdAt: timestamp,
        },
        {
          author: "Devin",
          body: "Demo reply recorded. Screenshot mode leaves your real Devin work and pull requests untouched.",
          createdAt: timestamp,
        },
      ],
    }));

    return "Demo response added.";
  }
}

let demoClient: DevinClient | undefined;

export function getDemoDevinClient(): DevinClient {
  demoClient ??= new DemoDevinClient();
  return demoClient;
}
