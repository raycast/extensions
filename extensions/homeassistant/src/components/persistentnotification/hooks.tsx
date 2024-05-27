import { getHAWSConnection } from "@lib/common";
import { getErrorMessage } from "@lib/utils";
import { useEffect, useState } from "react";
import { HAPersistentNotification } from "./utils";

export function useHAPersistentNotifications(): {
  error?: string;
  isLoading: boolean;
  notifications?: HAPersistentNotification[];
} {
  const [notifications, setNotifications] = useState<HAPersistentNotification[]>();
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
        const con = await getHAWSConnection();
        const data: HAPersistentNotification[] | undefined = await con.sendMessagePromise({
          type: "persistent_notification/get",
        });
        if (!didUnmount) {
          setNotifications(data);
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

  return { error, isLoading, notifications };
}
