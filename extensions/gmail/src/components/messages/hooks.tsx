import { useState, useEffect } from "react";
import { GMailMessage, getGMailMessages, getMailDetails } from "../../lib/gmail";
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
        const messages = await getGMailMessages(query);
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
  resultSizeEstimate?: number | null;
} {
  const [data, setData] = useState<GaxiosResponse<gmail_v1.Schema$Message>[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resultSizeEstimate, setResultSizeEstimate] = useState<number | null>();

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
        const ids = messages?.data?.messages?.map((m) => m.id as string).filter((m) => m);
        const details = await getMailDetails(ids);
        const resultPageSize = messages?.config.params.maxResults;
        const resultPageEstimatedSize = messages?.data.resultSizeEstimate;

        if (!didUnmount) {
          setData(details);
          /*if(resultPageSize && resultPageEstimatedSize){
            setResultSizeEstimate(resultPageSize * resultPageEstimatedSize); // result is wrong
          }*/
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

  return { error, isLoading, data, resultSizeEstimate };
}
