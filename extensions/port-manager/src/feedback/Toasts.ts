import { Toast } from "@raycast/api";

const Toasts = {
  KillProcess: {
    Error(e: unknown): Toast.Options {
      return {
        style: Toast.Style.Failure,
        title: `${(e as Error).message ?? e}`,
      };
    },
    Success(process: { name?: string; pid: number }): Toast.Options {
      return {
        style: Toast.Style.Success,
        title: "Killed Process",
        message: process.name ? `${process.name} (${process.pid})` : `${process.pid}`,
      };
    },
  },
} as const;

export default Toasts;
