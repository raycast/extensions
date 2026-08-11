export type PasswordOptions = { length?: number; numbers?: boolean; uppercase?: boolean; symbols?: boolean };
export function createPasswords(source: { generatePassword(options?: PasswordOptions): Promise<string> }) {
  return { generate: source.generatePassword };
}
