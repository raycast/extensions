import { useCachedPromise } from "@raycast/utils";
import { getUserCalendars } from "../services/calendar";
import { useAuth } from "./useAuth";

export const useGetUserCalendars = () => {
  const { authorize } = useAuth();

  return useCachedPromise(
    async () => {
      await authorize();
      const userCalendars = await getUserCalendars();
      return userCalendars;
    },
    [],
    { initialData: [] },
  );
};
