import { useCallback, useEffect, useState } from "react";
import { DEFAULT_TOOLTIP_FIELDS, loadTooltipFields, saveTooltipFields } from "../lib/tooltipFields";
import { TooltipField } from "../types";

/**
 * Owns which extra facts a Card's tooltip shows, and in what order. Lives in LocalStorage
 * (like the sort mode) so the choice survives relaunches.
 */
export function useTooltipFields() {
  const [fields, setFieldsState] = useState<TooltipField[]>(DEFAULT_TOOLTIP_FIELDS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTooltipFields().then((loaded) => {
      setFieldsState(loaded);
      setIsLoaded(true);
    });
  }, []);

  const setFields = useCallback((next: TooltipField[]) => {
    setFieldsState(next);
    saveTooltipFields(next);
  }, []);

  // Re-reads from LocalStorage, for callers whose own copy may be stale — e.g. the Grid's
  // after a Configure Card Tooltip popup (a separate hook instance) changed the saved fields.
  const reload = useCallback(() => {
    loadTooltipFields().then(setFieldsState);
  }, []);

  return { fields, setFields, reload, isTooltipFieldsLoaded: isLoaded };
}
