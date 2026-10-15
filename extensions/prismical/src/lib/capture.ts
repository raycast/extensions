import { Api, ApiError } from "./api";
export interface CaptureDraft {
  title: string;
  body: string;
  folder: string;
  id?: string;
  uncertain: boolean;
}
/** Persist before dispatch: quitting the command mid-request must not enable a blind retry. */
export async function saveCapture(
  api: Api,
  draft: CaptureDraft,
  persist: (draft: CaptureDraft) => Promise<void>,
): Promise<string> {
  if (draft.uncertain) throw new Error("Check Prismical before retrying this request.");
  let current = { ...draft };
  try {
    if (!current.id) {
      await persist({ ...current, uncertain: true });
      const note = await api.create(current.title, current.folder);
      current = { ...current, id: note.id, uncertain: false };
      await persist(current);
    }
    if (current.body) {
      await persist({ ...current, uncertain: true });
      await api.write(current.id!, current.body, "append");
    }
    await persist({ ...current, body: "", uncertain: false });
    return current.id!;
  } catch (error) {
    // A definite server rejection permits retry; unknown failures stay blocked.
    await persist({ ...current, uncertain: !(error instanceof ApiError) || error.uncertain });
    throw error;
  }
}
