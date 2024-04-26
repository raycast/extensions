import { useState } from "react";

const useErrorInForm = (): [string | undefined, (err: string) => void, () => void] => {
  const [error, setError] = useState<string | undefined>();

  function dropErrorIfNeeded() {
    if (error && error.length > 0) {
      setError(undefined);
    }
  }

  return [error, setError, dropErrorIfNeeded];
};

export default useErrorInForm;
