import { Logger } from "@chrismessina/raycast-logger";

// Create component-specific loggers
export const log = new Logger({ prefix: "[Reader]" });
export const urlLog = log.child("[URL]");
export const fetchLog = log.child("[Fetch]");
export const parseLog = log.child("[Parse]");
export const aiLog = log.child("[AI]");
export const paywallLog = log.child("[Paywall]");
