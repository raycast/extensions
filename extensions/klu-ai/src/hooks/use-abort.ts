import { useRef } from "react";

const useAbortController = () => {
  const ref = useRef(new AbortController());

  const renew = () => {
    if (!ref.current.signal.aborted) return;
    ref.current = new AbortController();
  };

  const abort = () => {
    ref.current?.abort();
  };

  return { ref, renew, abort };
};

export default useAbortController;
