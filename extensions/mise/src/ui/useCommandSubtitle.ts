import { updateCommandMetadata } from "@raycast/api";
import { useEffect } from "react";

export function useCommandSubtitle(subtitle: string | undefined) {
  useEffect(() => {
    if (subtitle !== undefined) updateCommandMetadata({ subtitle }).catch(() => undefined);
  }, [subtitle]);
}
