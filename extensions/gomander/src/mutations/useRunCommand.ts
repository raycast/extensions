import { useMutation } from "@tanstack/react-query";
import { service } from "../service";
import { showToast, Toast } from "@raycast/api";
import { defaultQueryClient } from "../react-query";

export const useRunCommand = ({ onSuccess }: { onSuccess: () => void }) =>
  useMutation(
    {
      mutationFn: service.runCommand,
      onSuccess: () => {
        onSuccess();
        showToast({ title: "Command started", style: Toast.Style.Success });
      },
      onError: (error: Error) => {
        showToast({ title: `Error starting command: ${error.message}`, style: Toast.Style.Failure });
      },
    },
    defaultQueryClient,
  );
