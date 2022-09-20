import type { Session } from "./types";
import { STORAGEKEY, generateId, log } from "./utilities";
import { LocalStorage } from "@raycast/api";

/** Add a session. Returns the updated list of all sessions. */
export const addSession = async (session: Omit<Session, "id">): Promise<{ data?: Session; error?: unknown }> => {
  const { data: allSessions, error } = await getSessions();

  if (error) return { error };

  const id = generateId();
  const updatedSessions = [...(allSessions || []), { ...session, id }];

  await LocalStorage.setItem(STORAGEKEY, JSON.stringify(updatedSessions));
  return { data: { ...session, id } };
};

/** Get all sessions. */
export const getSessions = async (): Promise<{ data?: Session[]; error?: unknown }> => {
  const storedSessionRecords = await LocalStorage.getItem<string>(STORAGEKEY);

  if (!storedSessionRecords) {
    return { data: [] };
  }

  try {
    const sessionRecords = JSON.parse(storedSessionRecords) as Session[];
    return { data: sessionRecords };
  } catch (error) {
    return { error: "Error while trying to parse LocalStorage" };
  }
};

/** Get a session by id. */
export const getSession = async (id: number): Promise<{ data?: Session; error?: unknown }> => {
  const { data: allSessions, error } = await getSessions();

  if (error) return { error };

  return { data: allSessions?.find((session) => session.id === id) };
};

/** Get most recent session. */
export const getMostRecentSession = async (): Promise<{ data?: Session; error?: unknown }> => {
  const { data: allSessions, error } = await getSessions();

  if (error) return { error };
  if (!allSessions || !allSessions?.length) return { error: "Sessions array is empty!" };

  const sortedSessions = allSessions.sort((a, b) => a.startTime - b.startTime);

  return { data: sortedSessions.at(-1) };
};

/** Update a session by sending in the acutal session object. */
export const updateSession = async (session: Session): Promise<{ data?: Session; error?: unknown }> => {
  const { data: allSessions, error } = await getSessions();

  if (error) return { error };
  if (!allSessions) return { error: "No sessions available!" };

  const elementIndex = allSessions.findIndex((_session) => _session.id === session.id);

  if (elementIndex > -1) {
    allSessions[elementIndex] = session;
    await LocalStorage.setItem(STORAGEKEY, JSON.stringify(allSessions));
    log("info", `Updated session with id: ${session.id} (${JSON.stringify(session)})`);
    return { data: session };
  } else return { error: `Could not find session with id: ${session.id}` };
};

/** Set all session. */
export const setAllSessions = async (sessions: Session[]) =>
  await LocalStorage.setItem(STORAGEKEY, JSON.stringify(sessions));

/** Delete a session. */
export const deleteSession = async (session: Session): Promise<{ data?: Session[]; error?: unknown }> => {
  const { data: allSessions, error } = await getSessions();

  if (error) return { error };
  if (!allSessions) return { error: "No sessions available!" };

  const elementIndex = allSessions.findIndex((_session) => _session.id === session.id);

  if (elementIndex) {
    const updatedSessions = allSessions.splice(elementIndex, 1);

    await LocalStorage.setItem(STORAGEKEY, JSON.stringify(updatedSessions));
    log("info", `Deleted session with id: ${session.id}`);
    return { data: updatedSessions };
  } else return { error: `Could not find session with id: ${session.id}` };
};
