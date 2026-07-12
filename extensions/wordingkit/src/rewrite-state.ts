import type { EditingMode } from "./modes";

type RewriteViewInput = {
  textLoading: boolean;
  modesLoading: boolean;
  modes: EditingMode[];
  error?: string;
};

export function getRewriteViewState({
  textLoading,
  modesLoading,
  modes,
  error,
}: RewriteViewInput): "loading" | "error" | "empty" | "ready" {
  if (textLoading || modesLoading) return "loading";
  if (error) return "error";
  if (modes.length === 0) return "empty";
  return "ready";
}
