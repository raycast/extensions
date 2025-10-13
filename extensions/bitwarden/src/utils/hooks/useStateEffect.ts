import { DependencyList, Dispatch, SetStateAction, useEffect, useState } from "react";

/** `useState` with dependencies. */
export function useStateEffect<S>(initialState: S | (() => S), deps: DependencyList): [S, Dispatch<SetStateAction<S>>] {
  const [state, setState] = useState<S>(initialState);

  useEffect(() => {
    setState(initialState);
  }, deps);

  return [state, setState];
}
