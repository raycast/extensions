import { useEffect, useState } from "react";
import { getErrorMessage } from "../../lib/utils";
import { GMailMessage, getMailDetail } from "../../lib/gmail";
import { gmail_v1 } from "@googleapis/gmail";

export function useMessage(message: GMailMessage): {
  error?: string;
  isLoading: boolean;
  data?: gmail_v1.Schema$Message;
} {
  const [data, setData] = useState<gmail_v1.Schema$Message>();
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
        const detail = await getMailDetail(message.id || "");
        if (!didUnmount) {
          setData(detail.data);
        }
      } catch (error) {
        if (!didUnmount) {
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
  }, []);

  return { error, isLoading, data };
}
