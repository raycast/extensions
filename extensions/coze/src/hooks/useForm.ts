import { useState, useCallback } from "react";

export const useForm = (defaultQuery: string = "") => {
  const [query, setQuery] = useState<string>(defaultQuery);
  const [queryError, setQueryError] = useState<string>();

  const validateField = useCallback((fieldName: string, value?: string) => {
    const isValid = value && value.length > 0;
    if (!isValid) {
      setQueryError(`${fieldName} should not be empty!`);
    } else {
      setQueryError(undefined);
    }
    return isValid;
  }, []);

  return {
    query,
    setQuery,
    queryError,
    validateField,
  };
};
