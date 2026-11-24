import { useState } from "react";

/**
 * The search query has to outlive a scope change. Switching the library picker between "All My
 * Libraries" and a single library swaps one component for another, so a query held in the
 * child's own state is destroyed by the remount — the user retypes what they just typed.
 *
 * The owner of the picker therefore owns the query and passes it down. Views rendered on their
 * own (a Quicklink, or pushed from a library row) have no such owner and fall back to local
 * state, so they still work unchanged.
 */
export function useSearchText(value?: string, onChange?: (next: string) => void) {
  const [internal, setInternal] = useState("");

  return [value ?? internal, onChange ?? setInternal] as const;
}
