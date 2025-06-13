// Raycast AI API is accessed through the global AI object
// No import needed as AI is available globally when AI capability is enabled in package.json

// Declare the global AI type for TypeScript
declare global {
  // Define the AI interface matching Raycast's AI API
  const AI: {
    ask: (prompt: string, options?: { creativity?: number; system?: string }) => Promise<string>;
  };
}

// Define proper interfaces for SonarQube data
interface SonarQubeMetric {
  metric: string;
  value: string | number;
}

interface SonarQubeIssue {
  message: string;
  severity: string;
  type: string;
  component: string;
  line?: number;
}

interface SonarQubeResults {
  metrics: SonarQubeMetric[];
  issues: SonarQubeIssue[];
}

interface IssueCount {
  [key: string]: number;
}

/**
 * Uses AI to interpret SonarQube analysis results and provide a human-readable summary
 * @param analysisResults The raw SonarQube analysis results
 * @returns A human-readable interpretation of the analysis
 */
export async function interpretAnalysisResults(analysisResults: SonarQubeResults): Promise<string> {
  // Prepare a more structured summary for the AI
  const metrics = analysisResults.metrics || [];
  const issues = analysisResults.issues || [];

  // Create a summarized version to avoid token limits
  const summary = {
    metrics: metrics.map((m: SonarQubeMetric) => ({ metric: m.metric, value: m.value })),
    issueCount: issues.length,
    issueTypes: countIssueTypes(issues),
    topIssues: issues.slice(0, 5).map((issue: SonarQubeIssue) => ({
      message: issue.message,
      severity: issue.severity,
      type: issue.type,
      component: issue.component,
      line: issue.line,
    })),
  };

  // Using the globally available AI object for Raycast extensions with AI capability
  const prompt = `Interpret these SonarQube analysis results and summarize the main issues in simple terms: ${JSON.stringify(summary)}`;
  const systemPrompt =
    "You are a SonarQube expert. Provide clear and concise explanations of code quality issues. Focus on the most serious issues first. Keep your response under 500 words.";

  // Use global AI object which is available when AI capability is enabled
  return await AI.ask(prompt, {
    creativity: 0.3,
    system: systemPrompt,
  });
}

/**
 * Uses AI to suggest code fixes for SonarQube issues
 * @param issueDetails Details about the SonarQube issue
 * @returns Suggested code fix
 */
export async function suggestCodeFixes(issueDetails: SonarQubeIssue): Promise<string> {
  // Using the globally available AI object for Raycast extensions with AI capability
  const prompt = `I have a SonarQube issue in my code that needs fixing:
    - Issue message: ${issueDetails.message}
    - Issue type: ${issueDetails.type}
    - Issue severity: ${issueDetails.severity}
    - In file: ${issueDetails.component}
    - On line: ${issueDetails.line || "unknown"}
    
    Can you suggest code to fix this issue? Be specific and follow best practices.`;
  const systemPrompt =
    "You are a SonarQube expert. Provide concise code fixes that follow best practices. Explain why your solution works. Keep your response under 400 words.";

  // Use global AI object which is available when AI capability is enabled
  return await AI.ask(prompt, {
    creativity: 0.3,
    system: systemPrompt,
  });
}

/**
 * Helper function to count issue types
 */
function countIssueTypes(issues: SonarQubeIssue[]): IssueCount {
  const counts: Record<string, number> = {};

  issues.forEach((issue) => {
    const type = issue.type || "unknown";
    counts[type] = (counts[type] || 0) + 1;
  });

  return counts;
}
