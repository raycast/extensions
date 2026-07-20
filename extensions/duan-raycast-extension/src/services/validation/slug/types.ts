export type ValidationResult = {
  isValid: boolean;
  message?: string;
};

export interface SlugValidationRules {
  format: (value: string | undefined) => ValidationResult;
}
