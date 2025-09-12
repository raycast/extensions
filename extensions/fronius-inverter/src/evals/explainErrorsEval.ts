import { AI } from "@raycast/api";
import explainErrors from "../tools/explainErrors";

/**
 * Evaluation for the explainErrors tool
 *
 * This evaluation validates that the error explanations are accurate and provide useful troubleshooting steps.
 * It checks that the explanation:
 * 1. Correctly identifies and explains the error codes
 * 2. Provides plausible causes for the issues
 * 3. Offers practical troubleshooting steps
 * 4. Is clear and understandable for non-technical users
 *
 * @returns {Promise<boolean>} True if the evaluation passes, false otherwise
 */
export default async function explainErrorsEval(): Promise<boolean> {
  try {
    // Get the error explanation from the tool
    const explanation = await explainErrors();

    // If no errors are detected, the tool should return a confirmation message
    if (explanation === "No errors detected. All inverters are operating normally.") {
      return true;
    }

    if (!explanation || explanation.trim().length === 0) {
      console.error("Error explanation returned empty result");
      return false;
    }

    // Use Raycast AI to evaluate the quality of the error explanation
    const evaluation = await AI.ask(`
      Evaluate this Fronius inverter error explanation for accuracy, helpfulness, and practicality:
      
      "${explanation}"
      
      Criteria:
      1. Does it clearly explain what the error means?
      2. Does it provide plausible causes for the issue?
      3. Does it offer practical troubleshooting steps?
      4. Is it understandable for non-technical users?
      
      For each criterion, answer YES or NO.
      Then provide an overall PASS or FAIL verdict.
      A PASS requires at least 3 YES answers.
    `);

    // Check if the evaluation contains a PASS verdict
    return evaluation.includes("PASS");
  } catch (error) {
    console.error("Error in explainErrorsEval:", error);
    return false;
  }
}
