import { useEffect } from "react";
import { useFetch } from "@raycast/utils";
import { formatTimeAgo, isPhoneNumber } from "./formatters";

type MailinatorResponse = {
  msgs: {
    subject: string;
    domain: string;
    origfrom: string;
    from: string;
    id: string;
    to: string;
    source: "EMAIL";
    time: number;
    seconds_ago: number;
  }[];
  domain: string;
  to: string;
};

const transformData = (data?: MailinatorResponse) =>
  (data?.msgs || []).map((msg) => ({
    id: msg.id,
    content: msg.subject,
    time: new Date(msg.time * 1000),
    timeAgo: formatTimeAgo(msg.seconds_ago),
    source: isPhoneNumber(msg.from) ? "sms" : "email",
    otpNumber: msg.subject.match(/\b\d{6}\b/g)?.[0] || "",
    from: msg.from,
  }));

export const useApi = (token: string) => {
  const isAuthenticated = !!token;

  const { isLoading, data, revalidate } = useFetch<MailinatorResponse>(
    `https://api.mailinator.com/api/v2/domains/private/inboxes?token=${token}&sort=descending&limit=10`,
    {
      execute: isAuthenticated,
    },
  );

  const items = transformData(data);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      revalidate();
    }, 5_000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return {
    isLoading,
    data: items,
    revalidate,
    isAuthenticated,
  };
};
