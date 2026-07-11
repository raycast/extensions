import { useEffect, useState } from "react";
import { getErrorMessage } from "../../lib/utils";
import { GMailMessage, getGMailCurrentProfile, getGMailLabels, getMailDetail } from "../../lib/gmail";
import { gmail_v1 } from "@googleapis/gmail";
import { useCachedPromise } from "@raycast/utils";
import { getGMailClient } from "../../lib/withGmailClient";

export function useMessage(message: GMailMessage): {
  error?: string;
  isLoading: boolean;
  data?: gmail_v1.Schema$Message;
} {
  const [data, setData] = useState<gmail_v1.Schema$Message>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { gmail } = getGMailClient();

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const detail = await getMailDetail(gmail, message.id || "");
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

export function useLabels(): {
  labels: gmail_v1.Schema$Label[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const {
    data: labels,
    isLoading,
    error,
  } = useCachedPromise(
    async () => {
      const { gmail } = getGMailClient();
      return await getGMailLabels(gmail);
    },
    [],
    { keepPreviousData: true },
  );
  return { labels, isLoading, error };
}

export function useCurrentProfile(gmail: gmail_v1.Gmail) {
  const { data: profile } = useCachedPromise(async () => {
    return await getGMailCurrentProfile(gmail);
  });
  return { profile };
}
