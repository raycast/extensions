import { AI } from "@raycast/api";
import optimizationSuggestions from "../tools/optimizationSuggestions";

/**
 * Evaluation for the optimizationSuggestions tool
 *
 * This evaluation validates that the optimization suggestions are practical and relevant to the system state.
 * It checks that the suggestions:
 * 1. Are relevant to the current system performance data
 * 2. Are practical and actionable for homeowners
 * 3. Provide clear benefits if implemented
 * 4. Are specific rather than generic
 *
 * @returns {Promise<boolean>} True if the evaluation passes, false otherwise
 */
export default async function optimizationSuggestionsEval(): Promise<boolean> {
  try {
    // Get the optimization suggestions from the tool
    const suggestions = await optimizationSuggestions();

    if (!suggestions || suggestions.trim().length === 0) {
      console.error("Optimization suggestions returned empty result");
      return false;
    }

    // Use Raycast AI to evaluate the quality of the optimization suggestions
    const evaluation = await AI.ask(`
      Evaluate these solar system optimization suggestions for practicality and relevance:
      
      "${suggestions}"
      
      Criteria:
      1. Are the suggestions relevant to the system performance data?
      2. Are they practical and actionable for homeowners?
      3. Do they provide clear benefits if implemented?
      4. Are they specific rather than generic advice?
      
      For each criterion, answer YES or NO.
      Then provide an overall PASS or FAIL verdict.
      A PASS requires at least 3 YES answers.
    `);

    // Check if the evaluation contains a PASS verdict
    return evaluation.includes("PASS");
  } catch (error) {
    console.error("Error in optimizationSuggestionsEval:", error);
    return false;
  }
}
