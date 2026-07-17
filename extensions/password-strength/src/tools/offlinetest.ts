import { checkPasswordStrength } from "@/lib";

type Input = {
  /**
   * The password to test the strength of
   */
  password: string;
};

/**
 * Test the password strength
 */
export default async function tool({ password }: Input): Promise<string> {
  const { strength } = await checkPasswordStrength(password);
  return `Password strength score: ${strength.score}\nPassword strength feedback warning: ${strength.feedback.warning}\nPassword strength suggestions: ${strength.feedback.suggestions.join(", ")}`;
}
