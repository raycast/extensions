import { StartAnalyzeOpenSonarQubeComponent } from "./lib/startAnalyzeOpenSonarQubeComponent";

/**
 * Command entry point for starting SonarQube, running analysis, and opening the app
 * The actual implementation is in lib/startAnalyzeOpenSonarQubeComponent.tsx to maintain clean code organization
 */
export default function Command() {
  return <StartAnalyzeOpenSonarQubeComponent />;
}
