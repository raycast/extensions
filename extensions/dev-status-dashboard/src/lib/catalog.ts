import type { Service } from "./providers/types";

// Curated set of popular dev services, all verified to expose a native Statuspage v2 API
// (GET {statusUrl}/api/v2/summary.json → 200). Services on a different backend — GitLab,
// Stripe, Neon, AWS, GCP, Slack — need dedicated providers and are deferred to a follow-up.
export const CATALOG: Service[] = [
  // AI
  { id: "openai", name: "OpenAI", category: "AI", statusUrl: "https://status.openai.com", provider: "statuspage" },
  {
    id: "anthropic",
    name: "Anthropic",
    category: "AI",
    statusUrl: "https://status.anthropic.com",
    provider: "statuspage",
  },
  {
    id: "moonshot",
    name: "Moonshot AI (Kimi)",
    category: "AI",
    statusUrl: "https://status.moonshot.cn",
    provider: "statuspage",
  },

  // Source Control
  {
    id: "github",
    name: "GitHub",
    category: "Source Control",
    statusUrl: "https://www.githubstatus.com",
    provider: "statuspage",
  },

  // Cloud & Hosting
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "Cloud",
    statusUrl: "https://www.cloudflarestatus.com",
    provider: "statuspage",
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "Cloud",
    statusUrl: "https://www.vercel-status.com",
    provider: "statuspage",
  },
  {
    id: "netlify",
    name: "Netlify",
    category: "Cloud",
    statusUrl: "https://www.netlifystatus.com",
    provider: "statuspage",
  },
  { id: "render", name: "Render", category: "Cloud", statusUrl: "https://status.render.com", provider: "statuspage" },
  { id: "fly-io", name: "Fly.io", category: "Cloud", statusUrl: "https://status.fly.io", provider: "statuspage" },
  {
    id: "railway",
    name: "Railway",
    category: "Cloud",
    statusUrl: "https://status.railway.com",
    provider: "statuspage",
  },
  {
    // Google Cloud's feed also carries Gemini / Vertex AI incidents.
    id: "google-cloud",
    name: "Google Cloud",
    category: "Cloud",
    statusUrl: "https://status.cloud.google.com",
    provider: "gcp",
  },
  {
    id: "aws",
    name: "AWS",
    category: "Cloud",
    statusUrl: "https://health.aws.amazon.com/health/status",
    provider: "aws",
  },

  // Database
  {
    id: "supabase",
    name: "Supabase",
    category: "Database",
    statusUrl: "https://status.supabase.com",
    provider: "statuspage",
  },
  {
    id: "planetscale",
    name: "PlanetScale",
    category: "Database",
    statusUrl: "https://www.planetscalestatus.com",
    provider: "statuspage",
  },
  {
    id: "mongodb-atlas",
    name: "MongoDB Atlas",
    category: "Database",
    statusUrl: "https://status.mongodb.com",
    provider: "statuspage",
  },

  // Monitoring
  {
    id: "sentry",
    name: "Sentry",
    category: "Monitoring",
    statusUrl: "https://status.sentry.io",
    provider: "statuspage",
  },
  {
    id: "datadog",
    name: "Datadog",
    category: "Monitoring",
    statusUrl: "https://status.datadoghq.com",
    provider: "statuspage",
  },

  // Communication
  {
    id: "discord",
    name: "Discord",
    category: "Communication",
    statusUrl: "https://discordstatus.com",
    provider: "statuspage",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    statusUrl: "https://status.slack.com",
    provider: "slack",
  },

  // Email & Payments
  {
    id: "twilio",
    name: "Twilio",
    category: "Communication",
    statusUrl: "https://status.twilio.com",
    provider: "statuspage",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    category: "Communication",
    statusUrl: "https://status.sendgrid.com",
    provider: "statuspage",
  },
  {
    id: "resend",
    name: "Resend",
    category: "Communication",
    statusUrl: "https://status.resend.com",
    provider: "statuspage",
  },
];

const BY_ID = new Map(CATALOG.map((service) => [service.id, service]));

export function serviceById(id: string): Service | undefined {
  return BY_ID.get(id);
}
