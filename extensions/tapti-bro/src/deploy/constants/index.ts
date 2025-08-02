import { DeployableService } from "../types";

export const GOOGLE_CHAT_WEBHOOK_URL =
  "https://chat.googleapis.com/v1/spaces/AAAANEuBG5s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=svj9D23bKTRXi7xcGT8p5HqIxFAhHnYfry3GCtEZNmE";

export const AVAILABLE_APPS: DeployableService[] = [
  {
    value: "api-server",
    title: "API Server",
    subtitle: "Deploy the Fusion API server",
    hasParams: true,
    icon: "🚀",
  },
  {
    value: "suite-backend",
    title: "Suite Backend",
    subtitle: "Deploy the Suite backend service",
    hasParams: true,
    icon: "⚙️",
  },
  {
    value: "ui-webapp",
    title: "UI Web App",
    subtitle: "Deploy the Fusion web application",
    hasParams: false,
    icon: "🌐",
  },
  {
    value: "ui-landing",
    title: "UI Landing",
    subtitle: "Deploy the Suite landing page",
    hasParams: false,
    icon: "🏠",
  },
  {
    value: "ui-api-dashboard",
    title: "UI API Dashboard",
    subtitle: "Deploy the Fusion API dashboard",
    hasParams: false,
    icon: "📊",
  },
  {
    value: "ui-oauth-portal",
    title: "UI OAuth Portal",
    subtitle: "Deploy the Fusion OAuth portal",
    hasParams: false,
    icon: "🔐",
  },
];

export const WORKFLOW_MONITORING = {
  MAX_ATTEMPTS: 60, // 5 minutes max (5 second intervals)
  CHECK_INTERVAL: 5000, // 5 seconds
  INITIAL_DELAY: 3000, // 3 seconds
  RECENT_WORKFLOWS_WINDOW: 10 * 60 * 1000, // 10 minutes
} as const;
