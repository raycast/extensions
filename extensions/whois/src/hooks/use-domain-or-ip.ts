import { useMemo } from "react";
import { showFailureToast, useCachedPromise, useFetch } from "@raycast/utils";
import type { ParsedInput } from "@/utils";
import { getURL, parseDomain } from "@/utils";

const useResolver = (input: ParsedInput | null, execute = true) => {
  const { data, isLoading } = useFetch<{
    Status: number;
    TC: boolean;
    RD: boolean;
    RA: boolean;
    AD: boolean;
    CD: boolean;
    Question: { name: string; type: number }[];
    Answer: { name: string; type: number; TTL: number; data: string }[];
  }>(`https://1.1.1.1/dns-query?name=${input?.input}`, {
    headers: {
      accept: "application/dns-json",
    },
    execute: execute && input !== null && input.isDomain,
    keepPreviousData: true,
    onError(error) {
      showFailureToast(error, {
        title: "Error fetching IP ",
        message: "Please make sure you have a valid domain.",
      });
    },
  });

  const ip = useMemo(() => {
    if (input && input.isIp) {
      return input.input;
    }
    if (!data || isLoading) {
      return null;
    }

    return data.Answer.find((a) => a.type === 1)?.data as string | null;
  }, [data, isLoading, input]);

  return {
    data: ip,
    isLoading,
  };
};

const useDomainOrIp = (input: string) => {
  const { data, isLoading, error } = useCachedPromise(
    async (inputString): Promise<string> => {
      let domainOrIp = inputString;

      // If no input is provided, fetch the URL from the frontmost browser (only on macOS)
      if (!domainOrIp) {
        if (process.platform === "darwin") {
          const currentUrl = await getURL();
          domainOrIp = new URL(currentUrl).hostname.replace("www.", "").toString();
        } else {
          // On non-macOS platforms, we can't get the browser URL, so return empty string
          domainOrIp = "";
        }
      }

      return domainOrIp;
    },
    [input],
  );

  if (error) {
    showFailureToast(error, {
      title: "Error fetching URL",
      message:
        process.platform === "darwin"
          ? "Please make sure you have a browser open with a valid URL."
          : "Please provide a domain or IP address as input.",
    });
  }

  const parsed = useMemo(() => {
    if (!data || isLoading) {
      return null;
    }
    return parseDomain(data);
  }, [data, isLoading]);

  const { data: resolvedIp, isLoading: ipLoading } = useResolver(parsed, parsed !== null);

  return {
    data: {
      ...parsed,
      ip: resolvedIp,
    },
    isLoading: ipLoading || isLoading,
    error,
  };
};

export default useDomainOrIp;
