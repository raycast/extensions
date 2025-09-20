import { useRef } from "react";

function useAbortController() {
  const abortControllerRef = useRef(new AbortController());

  const renew = () => {
    if (!abortControllerRef.current.signal.aborted) return;
    abortControllerRef.current = new AbortController();
  };

  const abort = () => {
    abortControllerRef.current?.abort();
  };

  return { abortControllerRef, renew, abort };
}

export default useAbortController;
