import { useState, useEffect } from "react";
import { GMailMessage, getGMailMessages } from "../../lib/gmail";
import { getErrorMessage } from "../../lib/utils";

export function useMessages(query?: string): {
  error?: string;
  isLoading: boolean;
  data?: GMailMessage[];
} {
  const [data, setData] = useState<GMailMessage[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const messages = await getGMailMessages(query);
        if (!didUnmount) {
          setData(messages);
        }
      } catch (error) {
        if (!didUnmount) {
          console.log(error);
          setError(getErrorMessage(error));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query]);

  return { error, isLoading, data };
}
