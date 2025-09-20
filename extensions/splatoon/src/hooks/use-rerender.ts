import { useReducer } from "react";

export function useRerender(): [() => void, number] {
  const [key, update] = useReducer((key: number): number => key + 1, 0);

  return [update, key];
}
