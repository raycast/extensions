import { useState, useEffect } from "react";
import { GMailMessage, getGMailMessageIds, getGMailMessages, getMailDetails } from "../../lib/gmail";
import { getErrorMessage } from "../../lib/utils";
import { GaxiosResponse } from "googleapis-common";
import { gmail_v1 } from "@googleapis/gmail";

export function useMessageIds(query?: string): {
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
        const messages = await getGMailMessageIds(query);
        if (!didUnmount) {
          setData(messages?.data.messages);
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
  }, [query]);

  return { error, isLoading, data };
}

export function useMessageDetails(query?: string): {
  error?: string;
  isLoading: boolean;
  data?: GaxiosResponse<gmail_v1.Schema$Message>[];
} {
  const [data, setData] = useState<GaxiosResponse<gmail_v1.Schema$Message>[]>();
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
        const details = await getGMailMessages(query);

        if (!didUnmount) {
          setData(details);
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
  }, [query]);

  return { error, isLoading, data };
}
