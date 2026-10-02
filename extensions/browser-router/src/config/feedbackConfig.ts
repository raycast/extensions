/**
 * Feedback Configuration for Browser Router
 *
 * Routes feedback through a secure Cloudflare Worker relay to protect
 * Discord Webhook URLs from being exposed in client bundles or public git repos.
 */
export const FEEDBACK_WORKER_URL = "https://search-router-feedback.kanha01945.workers.dev/";
