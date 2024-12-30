import { useState, useCallback } from "react";

export function useDropdown() {
  const [value, setValue] = useState("");

  const onChange = useCallback((value) => setValue(value), [value]);

  return { value, onChange };
}
