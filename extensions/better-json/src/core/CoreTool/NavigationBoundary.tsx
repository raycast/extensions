import { useEffect, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useNavigation } from "@raycast/api";
import type { WorkspaceNavigation } from "../workspaceNavigation";

export default function NavigationBoundary({
  navigation,
  id,
  children,
}: {
  navigation: WorkspaceNavigation;
  id: symbol;
  children: ReactNode;
}) {
  const version = useSyncExternalStore(navigation.subscribe, navigation.snapshot);
  const { pop } = useNavigation();
  const requested = useRef(false);
  useEffect(() => {
    if (navigation.shouldPop(id) && !requested.current) {
      requested.current = true;
      pop();
    }
  }, [navigation, id, version, pop]);
  return <>{children}</>;
}
