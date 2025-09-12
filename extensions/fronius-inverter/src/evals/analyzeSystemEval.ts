import { AI } from "@raycast/api";
import analyzeSystem from "../tools/analyzeSystem";

/**
 * Evaluation for the analyzeSystem tool
 *
 * This evaluation validates that the system analysis provides accurate and helpful insights.
 * It checks that the analysis:
 * 1. Correctly interprets the current system state
 * 2. Provides meaningful observations about production and consumption
 * 3. Offers actionable insights based on the energy flow data
 * 4. Maintains conciseness and clarity in the response
 *
 * @returns {Promise<boolean>} True if the evaluation passes, false otherwise
 */
export default async function analyzeSystemEval(): Promise<boolean> {
  try {
    // Get the analysis from the tool
    const analysis = await analyzeSystem();

    if (!analysis || analysis.trim().length === 0) {
      console.error("Analysis returned empty result");
      return false;
    }

    // Use Raycast AI to evaluate the quality of the analysis
    const evaluation = await AI.ask(`
      Evaluate this solar system analysis for accuracy, helpfulness, and actionability:
      
      "${analysis}"
      
      Criteria:
      1. Does it correctly summarize the current system state?
      2. Does it provide meaningful observations about production/consumption?
      3. Does it offer at least one actionable insight?
      4. Is it concise (3-4 sentences total)?
      
      For each criterion, answer YES or NO.
      Then provide an overall PASS or FAIL verdict.
      A PASS requires at least 3 YES answers.
    `);

    // Check if the evaluation contains a PASS verdict
    return evaluation.includes("PASS");
  } catch (error) {
    console.error("Error in analyzeSystemEval:", error);
    return false;
  }
}
