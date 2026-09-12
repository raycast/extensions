import { showToast, Toast } from "@raycast/api";

type InferArgs<T extends (...args: any) => any> = T extends (...args: [...infer Arg]) => any ? Arg : never;

export function wrapToast<T extends (...args: any) => any>(
  fn: T,
  initialWording: string,
  successWording: string,
  failureWording: string
) {
  return async (...args: InferArgs<T>) => {
    const toast = await showToast({ title: initialWording, style: Toast.Style.Animated });

    try {
      const result: ReturnType<T> = await fn(...args);
      toast.style = Toast.Style.Success;
      toast.title = successWording;
      return result;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = failureWording;
      if (err instanceof Error) {
        toast.message = err.message;
      }
      throw err;
    }
  };
}
