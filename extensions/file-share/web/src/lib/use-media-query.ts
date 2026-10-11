import { useEffect, useState } from "react";

/** Used when a breakpoint changes the markup, not just the styling: the list is a table on wide screens and a
 *  stack of rows on a phone, and rendering only the layout in use keeps the DOM honest. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
