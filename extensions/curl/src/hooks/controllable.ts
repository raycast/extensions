import { useState, useCallback, useInsertionEffect, useRef, useEffect } from "react";

/**
 * This hook is user-land implementation of the experimental `useEffectEvent` hook.
 * React docs: https://react.dev/learn/separating-events-from-effects#declaring-an-effect-event
 */
export function useCallbackRef<Args extends unknown[], Return>(
  callback: ((...args: Args) => Return) | undefined,
  deps: React.DependencyList = [],
) {
  const callbackRef = useRef<typeof callback>(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });

  useInsertionEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback((...args: Args) => callbackRef.current?.(...args), deps);
}

export interface UseControllableStateProps<T> {
  value?: T;
  defaultValue?: T | (() => T);
  onChange?: (value: T) => void;
  shouldUpdate?: (previous: T, next: T) => boolean;
}

/**
 * The `useControllableState` hook returns the state and function that updates the state, just like React.useState does.
 *
 * @see Docs https://chakra-ui.com/docs/hooks/use-controllable#usecontrollablestate
 */
export function useControllableState<T>(props: UseControllableStateProps<T>) {
  const { value: valueProp, defaultValue, onChange, shouldUpdate = (previous, next) => previous !== next } = props;

  const onChangeProp = useCallbackRef(onChange);
  const shouldUpdateProp = useCallbackRef(shouldUpdate);

  const [uncontrolledState, setUncontrolledState] = useState(defaultValue as T);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : uncontrolledState;

  const setValue = useCallbackRef(
    (next: React.SetStateAction<T>) => {
      const setter = next as (prevState?: T) => T;
      const nextValue = typeof next === "function" ? setter(value) : next;

      if (!shouldUpdateProp(value, nextValue)) {
        return;
      }

      if (!controlled) {
        setUncontrolledState(nextValue);
      }

      onChangeProp(nextValue);
    },
    [controlled, onChangeProp, value, shouldUpdateProp],
  );

  return [value, setValue] as [T, React.Dispatch<React.SetStateAction<T>>];
}

export interface UseDelegateStateProps<T> {
  value?: T;
  onChange: (value: T) => void;
}

export function useDelegateState<T>(props: UseDelegateStateProps<T>) {
  const { value, onChange } = props;

  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const setValue = useCallback(
    (next: T) => {
      setInternalValue(next);
      onChange(next);
    },
    [onChange],
  );

  return [internalValue, setValue] as [T, React.Dispatch<React.SetStateAction<T>>];
}
