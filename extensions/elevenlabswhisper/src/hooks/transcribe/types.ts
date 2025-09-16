import type { SoxError } from "../../services/audio.service";

export type SystemCheckResult =
  | { hasError: false }
  | {
      hasError: true;
      title: string;
      message: string;
      solution: string;
      action?: string;
      actionHandler?: () => void;
    };

export type SystemCheckState = {
  status: "pending" | "ok" | "error";
  error?: SoxError;
};
