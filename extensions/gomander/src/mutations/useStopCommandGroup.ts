import { useMutation } from "@tanstack/react-query";
import { service } from "../service";
import { showToast, Toast } from "@raycast/api";
import { defaultQueryClient } from "../react-query";

export const useStopCommandGroup = ({ onSuccess }: { onSuccess: () => void }) =>
  useMutation(
    {
      mutationFn: service.stopCommandGroup,
      onSuccess: () => {
        onSuccess();
        showToast({ title: "Command group stopped", style: Toast.Style.Success });
      },
      onError: (error: Error) => {
        showToast({ title: `Error stopping command group: ${error.message}`, style: Toast.Style.Failure });
      },
    },
    defaultQueryClient,
  );
