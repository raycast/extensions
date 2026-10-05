import { getPasswordSha, parsePwnedPasswordsResponse } from "@/lib";

type Input = {
  /**
   * The password to check against the haveibeenpwned database
   */
  password: string;
};

/**
 * Check if a password has been found in the Have I Been Pwned database, thus making it a compromised password.
 */
export default async function tool({ password }: Input): Promise<string> {
  const sha = getPasswordSha(password);
  const url = `https://api.pwnedpasswords.com/range/${sha.slice(0, 5)}`;

  try {
    const response = await fetch(url);
    const data = await parsePwnedPasswordsResponse(response);

    const find = data.find((item) => item.hash.toUpperCase().localeCompare(sha.slice(5)) === 0);
    if (!find) {
      return `Congratulations! It appears your password hasn't been found in online databases.`;
    }
    return `Warning! Your password has been found \`${find.count}\` times in online databases. Please consider using a different password.`;
  } catch (error) {
    return `Error while checking password: ${error}`;
  }
}
