import { Context, createContext, useEffect, useState } from "react";

export type Promisable<T> = T | PromiseLike<T>;
export type Loadable<T> = { loading: boolean; value?: T; error?: unknown };

export default function useLoadable<T>(loader: () => Promisable<T>): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ loading: true });

  useEffect(() => {
    const fetch = async () => {
      const value = await loader();
      setState({ loading: false, value });
    };

    fetch();
  }, []);

  return state;
}

export function createLoadableContext<T>(): Context<Loadable<T> | undefined> {
  return createContext<Loadable<T> | undefined>(undefined);
}
