import { List } from "@raycast/api";
import type { ReactNode } from "react";
import { usePreflight } from "../hooks/usePreflight";
import { SetupStatus } from "./SetupStatus";

export function PreflightGate(props: { children: ReactNode }) {
  const { result, isLoading, recheck } = usePreflight();

  if (result?.ok) return <>{props.children}</>;
  if (!result) return <List isLoading />;
  return <SetupStatus result={result} isLoading={isLoading} onRecheck={recheck} />;
}
