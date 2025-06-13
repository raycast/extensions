import { RunSonarAnalysisComponent } from "./lib/sonarQubeAnalysis";

/**
 * Command entry point for running SonarQube analysis
 * The actual implementation is in lib/sonarQubeAnalysis.tsx to maintain clean code organization
 */
export default function Command() {
  return <RunSonarAnalysisComponent />;
}
