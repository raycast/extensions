/**
 * Generates a git commit command prompt based on the provided description.
 *
 * This function takes a description string and formats it into a prompt
 * that instructs the user to create a git commit command following the Angular
 * commit message style. The output will be a string that contains the formatted
 * prompt, requesting only the command in response.
 *
 * @param description - A string that describes the context or content of the commit.
 *
 * @returns A formatted prompt string that instructs the generation of a git commit command.
 *
 * @example
 * const prompt = createPrompt("Fix login page bug");
 * console.log(prompt);
 * // Output: "Please generate a git commit command following the Angular commit message style based on the provided description. Ensure that you return only the commit command without any additional text or explanation: Fix login page bug"
 */

export const createPrompt = (description: string) =>
  `Please generate a git commit command following the Angular commit message style based on the provided description. 
  Ensure that you return only the commit command without any additional text or explanation: ${description}`;
