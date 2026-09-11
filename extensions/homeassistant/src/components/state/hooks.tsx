import { State } from "@lib/haapi";
import { useEffect, useState } from "react";

export function useStateSearch(
  query: string | undefined,
  domain: string,
  device_class?: string,
  allStates?: State[],
  aliases?: Record<string, string>,
): {
  states?: State[] | undefined;
} {
  const [states, setStates] = useState<State[]>();

  useEffect(() => {
    if (allStates) {
      let haStates: State[] = allStates;
      if (domain) {
        haStates = haStates.filter((s) => s.entity_id.startsWith(domain));
      }
      if (device_class) {
        haStates = haStates.filter((s) => s.attributes.device_class === device_class);
      }
      if (query) {
        const q = query.toLowerCase();
        haStates = haStates.filter((e) => {
          const alias = aliases?.[e.entity_id];
          return (
            e.entity_id.toLowerCase().includes(q) ||
            (e.attributes.friendly_name || "").toLowerCase().includes(q) ||
            (alias || "").toLowerCase().includes(q)
          );
        });
      }
      haStates = haStates.slice(0, 1000);
      setStates(haStates);
    } else {
      return undefined;
    }
  }, [query, allStates, aliases]);
  return { states };
}
