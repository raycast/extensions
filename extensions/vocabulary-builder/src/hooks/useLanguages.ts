import { useState } from "react";
import { Language } from "../data/types";
import { getLanguages } from "../data/data";

export function useLanguages() {
  const [languages, setLanguages] = useState<Language[]>(getLanguages);

  function refresh() {
    setLanguages(getLanguages());
  }

  return { languages, refresh };
}
