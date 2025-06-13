import { stopSonarQubeLogic } from "./lib/sonarQubeStopper";

/**
 * Command entry point for stopping the SonarQube instance
 * The actual implementation is in lib/sonarQubeStopper.ts to maintain clean code organization
 */
export default async function Command() {
  await stopSonarQubeLogic();
}
