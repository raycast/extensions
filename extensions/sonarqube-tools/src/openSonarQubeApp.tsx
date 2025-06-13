import { openSonarQubeAppLogic } from "./lib/sonarQubeOpener";

/**
 * Command entry point for opening the SonarQube application
 * The actual implementation is in lib/sonarQubeOpener.ts to maintain clean code organization
 */
export default async function Command() {
  await openSonarQubeAppLogic();
}
