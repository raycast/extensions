import { useEffect, useState } from "preact/hooks";
import { store } from "./store.js";

/** Subscribe the whole app store — fine for this page size. */
export function useAppStore() {
  const [state, setState] = useState(() => store.getState());
  useEffect(() => store.subscribe(setState), []);
  return state;
}

export function useMediaQuery(query) {
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
