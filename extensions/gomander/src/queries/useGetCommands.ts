import { useQuery } from "@tanstack/react-query";
import { service } from "../service";
import { Command } from "../types";
import { defaultQueryClient } from "../react-query";
import { showToast, Toast } from "@raycast/api";

export const useGetCommands = () =>
  useQuery(
    {
      queryKey: ["commands"],
      queryFn: service.fetchCommands,
      throwOnError: (error) => {
        showToast({ title: `Error fetching command: ${error.message}`, style: Toast.Style.Failure });
        return false;
      },
      initialData: [] as Command[],
    },
    defaultQueryClient,
  );
