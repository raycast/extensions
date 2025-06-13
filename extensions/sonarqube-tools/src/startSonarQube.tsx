import { startSonarQubeLogic } from "./lib/sonarQubeStarter";

/**
 * Command entry point for starting the SonarQube instance
 * The actual implementation is in lib/sonarQubeStarter.ts to maintain clean code organization
 */
export default async function Command() {
  await startSonarQubeLogic();
}
