/**
 * useForm hook for form state management and validation
 * Enhanced form handling with validation, error management, and submission
 */

import { useState, useCallback, useMemo } from "react";
import { ValidationRule } from "../types/ui";
import { validateForm, ValidationResult } from "../lib/validators/formValidators";

export interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: Partial<Record<keyof T, ValidationRule[]>>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onSubmit?: (values: T) => Promise<void> | void;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Record<keyof T, string | undefined>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;

  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string | undefined) => void;
  setErrors: (errors: Record<keyof T, string | undefined>) => void;
  setTouched: (field: keyof T, touched: boolean) => void;

  validateField: (field: keyof T) => string | undefined;
  validateForm: () => ValidationResult;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  handleReset: () => void;

  getFieldProps: <K extends keyof T>(
    field: K,
  ) => {
    value: T[K];
    onChange: (value: T[K]) => void;
    onBlur: () => void;
    error: string | undefined;
    required: boolean;
  };
}

/**
 * Enhanced form hook with validation and state management
 */
export function useForm<T extends Record<string, unknown>>(options: UseFormOptions<T>): UseFormReturn<T> {
  const { initialValues, validationRules = {}, validateOnChange = false, validateOnBlur = true, onSubmit } = options;

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<Record<keyof T, string | undefined>>(
    {} as Record<keyof T, string | undefined>,
  );
  const [touched, setTouchedState] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form is dirty (values differ from initial)
  const isDirty = useMemo(() => {
    return (Object.keys(initialValues) as (keyof T)[]).some((key) => values[key] !== initialValues[key]);
  }, [values, initialValues]);

  // Check if form is valid (no errors)
  const isValid = useMemo(() => {
    return Object.values(errors).every((error) => !error);
  }, [errors]);

  // Validate a single field
  const validateField = useCallback(
    (field: keyof T): string | undefined => {
      const rules = validationRules ? (validationRules[field as keyof typeof validationRules] ?? []) : [];
      if (rules.length === 0) return undefined;

      for (const rule of rules) {
        const error = validateFieldValue(values[field], rule);
        if (error) return error;
      }

      return undefined;
    },
    [values, validationRules],
  );

  // Validate entire form
  const validateFormFn = useCallback((): ValidationResult => {
    return validateForm(values, validationRules as Record<keyof T, ValidationRule[]>);
  }, [values, validationRules]);

  // Set a single field value
  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValuesState((prev) => ({ ...prev, [field]: value }));

      if (validateOnChange) {
        const error = validateField(field);
        setErrorsState((prev) => ({ ...prev, [field]: error }));
      }
    },
    [validateOnChange, validateField],
  );

  // Set multiple field values
  const setValues = useCallback(
    (newValues: Partial<T>) => {
      setValuesState((prev) => ({ ...prev, ...newValues }));

      if (validateOnChange) {
        const updatedErrors = { ...errors };
        Object.keys(newValues).forEach((key) => {
          const field = key as keyof T;
          updatedErrors[field] = validateField(field);
        });
        setErrorsState(updatedErrors);
      }
    },
    [errors, validateOnChange, validateField],
  );

  // Set field error
  const setError = useCallback((field: keyof T, error: string | undefined) => {
    setErrorsState((prev) => ({ ...prev, [field]: error }));
  }, []);

  // Set multiple field errors
  const setErrors = useCallback((newErrors: Record<keyof T, string | undefined>) => {
    setErrorsState(newErrors);
  }, []);

  // Set field touched state
  const setTouched = useCallback((field: keyof T, touchedValue: boolean) => {
    setTouchedState((prev) => ({ ...prev, [field]: touchedValue }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      setIsSubmitting(true);

      try {
        // Validate all fields
        const validation = validateFormFn();

        if (!validation.isValid) {
          const fieldErrors = {} as Record<keyof T, string | undefined>;
          validation.errors.forEach((error) => {
            const [field, message] = error.split(": ");
            fieldErrors[field as keyof T] = message;
          });
          setErrorsState(fieldErrors);
          return;
        }

        // Clear errors and submit
        setErrorsState({} as Record<keyof T, string | undefined>);

        if (onSubmit) {
          await onSubmit(values);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateFormFn, onSubmit],
  );

  // Reset form to initial state
  const handleReset = useCallback(() => {
    setValuesState(initialValues);
    setErrorsState({} as Record<keyof T, string | undefined>);
    setTouchedState({} as Record<keyof T, boolean>);
  }, [initialValues]);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback(
    <K extends keyof T>(field: K) => {
      const rules: ValidationRule[] = validationRules
        ? (validationRules[field as keyof typeof validationRules] ?? [])
        : [];
      const isRequired = rules.some((rule) => rule.type === "required");

      return {
        value: values[field],
        onChange: (value: T[K]) => setValue(field, value),
        onBlur: () => {
          setTouched(field, true);
          if (validateOnBlur) {
            const error = validateField(field);
            setError(field, error);
          }
        },
        error: errors[field],
        required: isRequired,
      };
    },
    [values, errors, setValue, setTouched, setError, validateOnBlur, validateField, validationRules],
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setValue,
    setValues,
    setError,
    setErrors,
    setTouched,
    validateField,
    validateForm: validateFormFn,
    handleSubmit,
    handleReset,
    getFieldProps,
  };
}

/**
 * Helper function to validate a single field value
 */
function validateFieldValue(value: unknown, rule: ValidationRule): string | null {
  switch (rule.type) {
    case "required":
      if (value === null || value === undefined || value === "") {
        return rule.message;
      }
      break;

    case "minLength":
      if (typeof value === "string" && value.length < (rule.value as number)) {
        return rule.message;
      }
      break;

    case "maxLength":
      if (typeof value === "string" && value.length > (rule.value as number)) {
        return rule.message;
      }
      break;

    case "pattern":
      if (typeof value === "string" && !(rule.value as RegExp).test(value)) {
        return rule.message;
      }
      break;

    case "custom":
      if (rule.validator && !rule.validator(value)) {
        return rule.message;
      }
      break;
  }

  return null;
}
