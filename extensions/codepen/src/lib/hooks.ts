import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { z } from "zod";
import { getClient } from "./api";

export function usePaged<T>(path: string, schema: z.ZodType<T>) {
  return usePromise(
    (endpoint: string) =>
      async ({ cursor }: { cursor?: string }) => {
        const page = await getClient().page(cursor ?? endpoint, schema);
        return { data: page.data, hasMore: page.next !== null, cursor: page.next };
      },
    [path],
  );
}

export function useMutation() {
  const busy = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  async function run<T>(title: string, operation: () => Promise<T>, onSuccess?: (value: T) => void | Promise<unknown>) {
    if (busy.current) return;
    busy.current = true;
    setIsLoading(true);
    let toast: Toast | undefined;
    try {
      toast = await showToast({ style: Toast.Style.Animated, title });
      const value = await operation();
      toast.style = Toast.Style.Success;
      toast.title = title;
      try {
        await onSuccess?.(value);
      } catch {
        toast.message = "The change succeeded. Refresh CodePen to see it.";
      }
    } catch (error) {
      if (!toast) throw error;
      toast.style = Toast.Style.Failure;
      toast.title = "CodePen request failed";
      toast.message = error instanceof Error ? error.message : "Please try again";
    } finally {
      busy.current = false;
      setIsLoading(false);
    }
  }
  return { run, isLoading };
}
