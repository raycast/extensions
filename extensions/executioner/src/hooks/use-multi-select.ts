import { useState, useCallback } from "react";

export function useMultiSelect() {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = useCallback((pid: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((pids: number[]) => {
    setSelected(new Set(pids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback(
    (pid: number) => selected.has(pid),
    [selected],
  );

  return {
    selected,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
    count: selected.size,
  };
}
