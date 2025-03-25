import { DependencyList, EffectCallback, useEffect, useRef } from "react";

export function usePrevious<T = unknown>(value: T, initialValue: T) {
  const ref = useRef(initialValue);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export default function useEffectDebugger(
  effectHook: EffectCallback,
  dependencies?: DependencyList,
  dependencyNames: string[] = []
) {
  const previousDeps = usePrevious(dependencies, []);

  const changedDeps = dependencies?.reduce((accum, dependency, index) => {
    if (dependency !== previousDeps?.[index]) {
      const keyName = dependencyNames[index] || index;
      return {
        ...accum,
        [keyName]: {
          before: previousDeps?.[index],
          after: dependency,
        },
      };
    }

    return accum;
  }, {});

  if (Object.keys(changedDeps).length) {
    console.log("[use-effect-debugger] ", changedDeps);
  }

  useEffect(effectHook, dependencies);
}
