import { State } from "@lib/haapi";
import { useEffect, useState } from "react";

export function useStateSearch(
  query: string | undefined,
  domain: string,
  device_class?: string,
  allStates?: State[],
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
        haStates = haStates.filter(
          (e) =>
            e.entity_id.toLowerCase().includes(query.toLowerCase()) ||
            (e.attributes.friendly_name || "").toLowerCase().includes(query.toLowerCase()),
        );
      }
      haStates = haStates.slice(0, 1000);
      setStates(haStates);
    } else {
      return undefined;
    }
  }, [query, allStates]);
  return { states };
}
