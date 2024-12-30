import { useEffect, useState } from "react";
import { Observable, combineLatest } from "rxjs";

// #region Observable

export const useDataObservable = <T>(
  observable: Observable<T | null>,
  fetchData: (forceRefresh?: boolean) => Promise<void>,
  forceRefresh = false,
): { data: T | null } => {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    const subscription = observable.subscribe((newData) => {
      setData(newData);
    });

    // Load initial data
    fetchData(forceRefresh);

    return () => {
      // Unsubscribe on cleanup
      subscription.unsubscribe();
    };
  }, [observable, fetchData]);

  return { data };
};

// #endregion

// #region Abonner Observable

export const useSubscribeObservable = <T>(observable: Observable<T | null>): { data: T | null } => {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    const subscription = observable.subscribe((newData) => {
      setData(newData);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [observable]);

  return { data };
};

// #endregion

// #region Combine Observables
type ObservableValue<T> = T extends Observable<infer U> ? U : never;

type ObservableValues<T extends Record<string, Observable<unknown>>> = {
  [K in keyof T]: ObservableValue<T[K]>;
};

export const useCombinedObservables = <T extends Record<string, Observable<unknown>>>(
  observables: T,
  callback: (result: ObservableValues<T>) => void,
) => {
  const keys: string[] = Object.keys(observables);
  const obsArray = keys.map((key) => observables[key]);

  useEffect(() => {
    const subscription = combineLatest(obsArray).subscribe((values) => {
      const result = values.reduce<ObservableValues<T>>((acc, value, index) => {
        acc[keys[index] as keyof T] = value as ObservableValue<T[keyof T]>;
        return acc;
      }, {} as ObservableValues<T>);

      callback(result);
    });

    return () => subscription.unsubscribe();
  }, [observables, callback]);
};

// #endregion
