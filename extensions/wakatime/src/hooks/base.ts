import { environment, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

export function useBase<D>({ handler, toasts = {} }: Props<D>) {
  const [data, setData] = useState<D>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);
  const canShowToasts = environment.launchType === "userInitiated";

  useEffect(() => {
    async function run() {
      setError(undefined);
      setData(undefined);
      setIsLoading(true);

      const toast =
        canShowToasts && toasts.loading
          ? await showToast({ ...toasts.loading, style: Toast.Style.Animated })
          : undefined;

      try {
        const { ok, error, result } = await handler();

        if (!ok) throw new Error(error);
        setData(result as D);

        if (canShowToasts && toasts.success) {
          if (toast == undefined) return showToast({ ...toasts.success, style: Toast.Style.Success });
          toast.style = Toast.Style.Success;
          toast.title = toasts.success.title;
          toast.message = toasts.success.message;
        }
      } catch (error) {
        const err = error as Error;
        setError(err);

        if (canShowToasts && toasts.error) {
          const { title, message } = typeof toasts.error === "function" ? toasts.error(err) : toasts.error;
          if (toast == undefined) return showToast({ title, message, style: Toast.Style.Failure });
          toast.style = Toast.Style.Failure;
          toast.title = title;
          toast.message = message;
        }
      }

      setIsLoading(false);
    }

    void run();
  }, [handler]);

  return { data, error, isLoading };
}

type Props<D> = {
  handler(): Promise<Types.RouteResponse<D>>;
  toasts?: Partial<{
    loading: Omit<Toast.Options, "style">;
    success: Pick<Toast.Options, "title" | "message">;
    error: Pick<Toast.Options, "title" | "message"> | ((err: Error) => Pick<Toast.Options, "title" | "message">);
  }>;
};
