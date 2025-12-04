import { useMutation } from "@tanstack/react-query";
import { service } from "../service";
import { showToast, Toast } from "@raycast/api";
import { defaultQueryClient } from "../react-query";

export const useStopCommand = ({ onSuccess }: { onSuccess: () => void }) =>
  useMutation(
    {
      mutationFn: service.stopCommand,
      onSuccess: () => {
        onSuccess();
        showToast({ title: "Command stopped", style: Toast.Style.Success });
      },
      onError: (error: Error) => {
        showToast({ title: `Error stopping command: ${error.message}`, style: Toast.Style.Failure });
      },
    },
    defaultQueryClient,
  );
