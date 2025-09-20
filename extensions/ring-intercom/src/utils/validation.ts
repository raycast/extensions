import { AuthState } from "../types";

export function validateForm(
  email: string | undefined,
  password: string | undefined,
  twoFactorType: string | null,
  twoFactorCode: string,
): { hasError: boolean; errors: Partial<AuthState> } {
  const errors: Partial<AuthState> = {};
  let hasError = false;

  // Email validation
  if (!email) {
    errors.emailError = true;
    hasError = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.emailFormatError = "Please enter a valid email";
    hasError = true;
  }

  // Password validation
  if (!password) {
    errors.passwordError = true;
    hasError = true;
  }

  // 2FA validation
  if (twoFactorType) {
    if (!twoFactorCode) {
      errors.twoFactorError = true;
      hasError = true;
    } else if (twoFactorCode.length < 6) {
      errors.twoFactorNumericError = "Code must be 6 digits";
      hasError = true;
    }
  }

  return { hasError, errors };
}
