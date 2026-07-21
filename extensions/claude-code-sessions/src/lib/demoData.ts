import { homedir } from "os";
import { join } from "path";
import { SessionMeta, SessionPreviewMessage } from "./sessions";
import { DesktopSessionInfo } from "./desktopSessions";
import { ConductorWorkspaceInfo } from "./conductor";

/**
 * Fake data for taking Raycast Store screenshots without exposing real
 * session names/projects. Dev-only — gated behind `environment.isDevelopment`
 * in list-sessions.tsx, so this never ships to a store build's UI. `NOW` is
 * captured once at module load (not hardcoded), so relative times ("8m",
 * "3d", "2w"...) always look current whenever this loads.
 */
const HOME = homedir();
const NOW = Date.now();

function minutesAgo(minutes: number): Date {
  return new Date(NOW - minutes * 60_000);
}

type Surface = "cli" | "claude" | "conductor";

interface DemoSpec {
  id: string;
  title: string;
  project: string;
  surface: Surface;
  minutesAgo: number;
  messageCount: number;
  sizeBytes: number;
  archived?: boolean;
  worktree?: string;
  city?: string;
  slug?: string;
  branch?: string;
  firstPrompt: string;
  /** Which title source to exercise — defaults to "custom". */
  titleSource?: "custom" | "ai" | "first-prompt";
  preview: SessionPreviewMessage[];
}

const SPECS: DemoSpec[] = [
  {
    id: "demo-fix-flaky-checkout-spec",
    title: "Fix flaky checkout spec",
    project: "acme-storefront",
    surface: "cli",
    minutesAgo: 8,
    messageCount: 42,
    sizeBytes: 210_000,
    worktree: "fix-flaky-checkout",
    slug: "quiet-river-fern",
    branch: "fix-flaky-checkout",
    firstPrompt:
      "The checkout spec fails about 1 in 10 runs on CI, looks like a race condition around the payment mock. Can you dig in?",
    preview: [
      {
        role: "user",
        text: "Can you also add a retry with backoff so we're not stuck if this happens again?",
      },
      {
        role: "assistant",
        text: "Added a 3-retry backoff around the payment mock wait, and pinned the mock's clock so timing can't drift. CI's been green for the last 12 runs.",
      },
    ],
  },
  {
    id: "demo-dark-mode-settings",
    title: "Add dark mode to settings screen",
    project: "mobile-app",
    surface: "claude",
    minutesAgo: 45,
    messageCount: 87,
    sizeBytes: 640_000,
    firstPrompt:
      "Users keep asking for dark mode. Let's start with just the settings screen as a first pass.",
    titleSource: "ai",
    preview: [
      {
        role: "assistant",
        text: "Settings screen now follows the system color scheme, with a manual override toggle stored in preferences.",
      },
      {
        role: "user",
        text: "Nice, can you make the toggle itself work in both modes too? It's invisible in dark mode right now.",
      },
      {
        role: "assistant",
        text: "Fixed — the toggle track and thumb both now use theme-aware colors.",
      },
    ],
  },
  {
    id: "demo-migrate-ci-actions",
    title: "Migrate CI to GitHub Actions",
    project: "infra-tools",
    surface: "cli",
    minutesAgo: 130,
    messageCount: 156,
    sizeBytes: 1_100_000,
    firstPrompt:
      "We're moving off CircleCI. Can you port the build/test/deploy pipeline to GitHub Actions?",
    preview: [
      {
        role: "user",
        text: "Deploy step needs the prod secrets too, not just staging.",
      },
      {
        role: "assistant",
        text: "Added the prod environment with its own secret scope and a manual approval gate before it runs.",
      },
    ],
  },
  {
    id: "demo-slow-product-search",
    title: "Investigate slow product search",
    project: "acme-storefront",
    surface: "conductor",
    minutesAgo: 320,
    messageCount: 63,
    sizeBytes: 380_000,
    city: "austin",
    branch: "luiseugenio/austin",
    firstPrompt:
      "Product search is taking 3-4 seconds for some queries. Can you find out why?",
    preview: [
      {
        role: "assistant",
        text: "Found it — the search query wasn't using the trigram index on `products.name`, so it was doing a full table scan for partial matches.",
      },
      { role: "user", text: "How much did that help?" },
      {
        role: "assistant",
        text: "p95 query time went from 3.2s to 140ms in staging.",
      },
    ],
  },
  {
    id: "demo-refactor-payment-webhooks",
    title: "Refactor payment webhooks",
    project: "acme-storefront",
    surface: "claude",
    minutesAgo: 540,
    messageCount: 214,
    sizeBytes: 1_800_000,
    worktree: "refactor-payment-webhooks",
    slug: "amber-forest-owl",
    branch: "refactor-payment-webhooks",
    firstPrompt:
      "The payment webhook handler has grown into one giant function. Let's split it up by event type before we add the new provider.",
    preview: [
      {
        role: "user",
        text: "Looks good. Can we also log which handler picked up each event, for debugging?",
      },
      {
        role: "assistant",
        text: "Added structured logging per handler with the event id and type, so you can trace a webhook through the whole flow now.",
      },
    ],
  },
  {
    id: "demo-bump-react-native",
    title: "Bump React Native to 0.75",
    project: "mobile-app",
    surface: "cli",
    minutesAgo: 1440,
    messageCount: 98,
    sizeBytes: 720_000,
    firstPrompt:
      "Time to upgrade React Native. Last time this took a while because of native module breakage — let's plan it out first.",
    preview: [
      {
        role: "assistant",
        text: "Upgrade's done. Had to patch two native modules that used a removed C++ API, both now build clean on the new architecture.",
      },
    ],
  },
  {
    id: "demo-staging-kubernetes",
    title: "Set up staging Kubernetes cluster",
    project: "infra-tools",
    surface: "conductor",
    minutesAgo: 1500,
    messageCount: 172,
    sizeBytes: 1_400_000,
    city: "denver",
    branch: "luiseugenio/denver",
    firstPrompt:
      "We need a staging cluster that mirrors prod but on a smaller node pool. Can you set that up with Terraform?",
    preview: [
      {
        role: "user",
        text: "Can it auto-scale down to zero overnight to save cost?",
      },
      {
        role: "assistant",
        text: "Yes — added a scheduled scaler that drops the node pool to zero at midnight and back up at 7am on weekdays.",
      },
    ],
  },
  {
    id: "demo-push-notification-delivery",
    title: "Debug push notification delivery",
    project: "mobile-app",
    surface: "claude",
    minutesAgo: 4320,
    messageCount: 51,
    sizeBytes: 300_000,
    archived: true,
    firstPrompt:
      "Some users say push notifications just stopped arriving. Can you check the delivery pipeline?",
    preview: [
      {
        role: "assistant",
        text: "Root cause was an expired APNs certificate — renewed it and added a monitor that alerts 30 days before the next expiry.",
      },
    ],
  },
  {
    id: "demo-cleanup-feature-flags",
    title: "Clean up unused feature flags",
    project: "acme-storefront",
    surface: "cli",
    minutesAgo: 4400,
    messageCount: 29,
    sizeBytes: 140_000,
    archived: true,
    firstPrompt:
      "We've got dozens of feature flags nobody's touched in months. Can you find the ones safe to remove?",
    preview: [
      {
        role: "assistant",
        text: "Removed 14 flags that were either fully rolled out or fully killed, and their dead code paths.",
      },
    ],
  },
  {
    id: "demo-sentry-error-tracking",
    title: "Add Sentry error tracking",
    project: "infra-tools",
    surface: "claude",
    minutesAgo: 8640,
    messageCount: 74,
    sizeBytes: 480_000,
    firstPrompt:
      "We have no visibility into production errors right now. Let's wire up Sentry across all our services.",
    titleSource: "ai",
    preview: [
      {
        role: "user",
        text: "Make sure it scrubs PII from the error payloads before it leaves our network.",
      },
      {
        role: "assistant",
        text: "Added a scrubber for emails, phone numbers, and auth tokens in both breadcrumbs and error context.",
      },
    ],
  },
  {
    id: "demo-speed-up-onboarding-tests",
    title: "Speed up onboarding flow tests",
    project: "mobile-app",
    surface: "cli",
    minutesAgo: 20160,
    messageCount: 38,
    sizeBytes: 190_000,
    firstPrompt:
      "The onboarding test suite takes 9 minutes on its own. Can you find what's slow and speed it up?",
    preview: [
      {
        role: "assistant",
        text: "Mocked out the network calls that were hitting a real (slow) staging API — suite's down to 90 seconds.",
      },
    ],
  },
  {
    id: "demo-terraform-s3-backups",
    title: "Write Terraform for S3 backups",
    project: "infra-tools",
    surface: "conductor",
    minutesAgo: 20600,
    messageCount: 46,
    sizeBytes: 260_000,
    archived: true,
    city: "raleigh",
    branch: "luiseugenio/raleigh",
    firstPrompt:
      "We need automated, versioned backups of the reporting bucket to a separate region. Can you write the Terraform for that?",
    preview: [
      {
        role: "assistant",
        text: "Added cross-region replication with a 90-day lifecycle policy on the backup bucket.",
      },
    ],
  },
  {
    id: "demo-cart-abandonment-emails",
    title: "Improve cart abandonment emails",
    project: "acme-storefront",
    surface: "claude",
    minutesAgo: 43200,
    messageCount: 112,
    sizeBytes: 900_000,
    firstPrompt:
      "Our cart abandonment emails have a really low open rate. Can you help rewrite the subject lines and timing?",
    titleSource: "first-prompt",
    preview: [
      {
        role: "assistant",
        text: "Changed the send timing to 1h/24h/72h instead of a single email at 24h, and personalized the subject line with the item name.",
      },
      { role: "user", text: "Any early numbers?" },
      {
        role: "assistant",
        text: "Open rate is up from 11% to 19% in the first week of the test.",
      },
    ],
  },
  {
    id: "demo-upgrade-node-20",
    title: "Upgrade Node to 20 LTS",
    project: "infra-tools",
    surface: "cli",
    minutesAgo: 44000,
    messageCount: 33,
    sizeBytes: 170_000,
    firstPrompt:
      "Node 18 goes EOL soon. Can you upgrade all our services to 20 LTS and fix whatever breaks?",
    preview: [
      {
        role: "assistant",
        text: "All services build and pass tests on Node 20 now — one dependency needed a minor version bump for compatibility.",
      },
    ],
  },
  {
    id: "demo-polish-empty-states",
    title: "Polish empty states across app",
    project: "mobile-app",
    surface: "conductor",
    minutesAgo: 46000,
    messageCount: 67,
    sizeBytes: 410_000,
    city: "boise",
    branch: "luiseugenio/boise",
    firstPrompt:
      "A bunch of our empty states (no orders, no favorites, no search results) are just blank white screens. Can you design and add proper ones?",
    preview: [
      {
        role: "assistant",
        text: "Added illustrated empty states with a short message and a relevant call-to-action for orders, favorites, and search.",
      },
    ],
  },
];

function buildCwd(spec: DemoSpec): string {
  if (spec.surface === "conductor") {
    return join(
      HOME,
      "conductor",
      "workspaces",
      spec.project,
      spec.city ?? "demo-city",
    );
  }
  if (spec.worktree) {
    return join(
      HOME,
      "Developer",
      spec.project,
      ".claude",
      "worktrees",
      spec.worktree,
    );
  }
  return join(HOME, "Developer", spec.project);
}

export interface DemoDataset {
  sessions: SessionMeta[];
  desktopIndex: Record<string, DesktopSessionInfo>;
  conductorWorkspaces: Record<string, ConductorWorkspaceInfo>;
  conductorTitles: Record<string, string>;
  previewMessages: Record<string, SessionPreviewMessage[]>;
}

/** Builds the whole fake dataset fresh each time, so relative times stay accurate for long-running dev sessions. */
export function buildDemoDataset(): DemoDataset {
  const sessions: SessionMeta[] = [];
  const desktopIndex: Record<string, DesktopSessionInfo> = {};
  const conductorWorkspaces: Record<string, ConductorWorkspaceInfo> = {};
  const conductorTitles: Record<string, string> = {};
  const previewMessages: Record<string, SessionPreviewMessage[]> = {};

  for (const spec of SPECS) {
    const cwd = buildCwd(spec);
    const mtime = minutesAgo(spec.minutesAgo);
    const createdAt = minutesAgo(
      spec.minutesAgo + Math.round(spec.messageCount * 1.5),
    );

    sessions.push({
      sessionId: spec.id,
      filePath: join(HOME, ".claude", "projects", "demo", `${spec.id}.jsonl`),
      projectDirName: `-demo-${spec.project}`,
      cwd,
      gitBranch: spec.branch,
      slug: spec.slug,
      entrypoint: spec.surface === "claude" ? "claude-desktop" : "cli",
      version: "2.1.215",
      createdAt,
      mtime,
      size: spec.sizeBytes,
      firstPromptTitle: spec.title,
      firstPromptFull: spec.firstPrompt,
      customTitle:
        spec.titleSource === "custom" || spec.titleSource === undefined
          ? spec.title
          : undefined,
      aiTitle: spec.titleSource === "ai" ? spec.title : undefined,
      messageCount: spec.messageCount,
    });

    previewMessages[spec.id] = spec.preview;

    if (spec.surface === "claude") {
      desktopIndex[spec.id] = {
        localSessionId: `local_${spec.id}`,
        cliSessionId: spec.id,
        title: spec.titleSource === "ai" ? undefined : spec.title,
        cwd,
        isArchived: spec.archived ?? false,
      };
    }

    if (spec.surface === "conductor") {
      conductorWorkspaces[cwd] = {
        id: `demo-workspace-${spec.id}`,
        state: spec.archived ? "archived" : "ready",
      };
      conductorTitles[spec.id] = spec.title;
    }
  }

  return {
    sessions,
    desktopIndex,
    conductorWorkspaces,
    conductorTitles,
    previewMessages,
  };
}
