import { useCallback, useEffect, useState } from "react";

import {
  changeInteractiveModel,
  configureInteractivePermissionProfile,
  configureInteractiveStartup,
  getInteractiveSnapshot,
  interruptInteractiveSession,
  resizeInteractiveSession,
  sendInteractiveControlKey,
  sendInteractiveInput,
  startInteractiveSession,
  stopInteractiveSession,
  subscribeToInteractiveSession,
  toggleInteractiveFastMode,
} from "../lib/interactive";
import { ChatSession } from "../lib/types";

export function useInteractiveSession(session: ChatSession) {
  const [snapshot, setSnapshot] = useState(() => getInteractiveSnapshot(session));

  useEffect(() => subscribeToInteractiveSession(session, setSnapshot), [session]);

  const send = useCallback((input: string) => sendInteractiveInput(session, input), [session]);
  const start = useCallback(() => startInteractiveSession(session), [session]);
  const changeModel = useCallback(
    (selection: Parameters<typeof changeInteractiveModel>[1]) => changeInteractiveModel(session, selection),
    [session],
  );
  const interrupt = useCallback(() => interruptInteractiveSession(session), [session]);
  const configurePermissions = useCallback(
    (profileId: string) => configureInteractivePermissionProfile(session, profileId),
    [session],
  );
  const configureStartup = useCallback(
    (configuration: Parameters<typeof configureInteractiveStartup>[1]) =>
      configureInteractiveStartup(session, configuration),
    [session],
  );
  const sendKey = useCallback(
    (key: Parameters<typeof sendInteractiveControlKey>[1]) => sendInteractiveControlKey(session, key),
    [session],
  );
  const stop = useCallback(() => stopInteractiveSession(session), [session]);
  const toggleFast = useCallback(() => toggleInteractiveFastMode(session), [session]);
  const resize = useCallback(
    (columns: number, rows: number) => resizeInteractiveSession(session, columns, rows),
    [session],
  );

  return {
    snapshot,
    start,
    send,
    changeModel,
    toggleFast,
    configurePermissions,
    configureStartup,
    sendKey,
    interrupt,
    stop,
    resize,
  };
}
