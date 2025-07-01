import { useState } from "react";
import { COMMIT_TYPES } from "../constant/commitType";

type ScopeState = {
  commitTypes: string[];
  filterCommitType: (filter?: string) => string[];
};

export default function useCommitType(): ScopeState {
  const defaultScopes = COMMIT_TYPES.map((commitType) => commitType.label);
  const [commitTypes, setCommitTypes] = useState<string[]>(defaultScopes);

  const filterCommitType = (filter?: string): string[] => {
    if (!filter) {
      setCommitTypes(defaultScopes);
      return defaultScopes;
    }

    const filtered = defaultScopes.filter((commitType) => commitType.toLowerCase().includes(filter.toLowerCase()));
    setCommitTypes(filtered);
    return filtered;
  };

  return {
    commitTypes,
    filterCommitType,
  };
}
