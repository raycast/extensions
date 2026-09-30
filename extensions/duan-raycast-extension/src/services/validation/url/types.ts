export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface UrlValidationRules {
  format: (value: string | undefined) => ValidationResult;
}
