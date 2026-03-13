import { useRef, useEffect } from "react";

export const usePreviousState = (value: any): any => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
