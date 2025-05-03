import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createContext, useContext } from "react";

import { getErrorAction } from "@/helper/error";
import { useCachedNotes } from "@/hooks/useCachedNotes";
import { syncVault } from "@/lib/dcli";
import { VaultNote } from "@/types/dcli";

export type NotesContextType = {
  notes: VaultNote[] | undefined;
  isLoading: boolean;
  isInitialLoaded: boolean;
  sync: () => void;
};

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const { notes, isLoading, isInitialLoaded, revalidate } = useCachedNotes();

  async function sync() {
    try {
      const toast = await showToast({
        title: "Syncing with Dashlane",
        style: Toast.Style.Animated,
      });

      await syncVault();

      toast.style = Toast.Style.Success;
      toast.title = "Sync with Dashlane succeeded";

      await revalidate();

      toast.hide();
    } catch (error) {
      await showFailureToast(error, {
        primaryAction: getErrorAction(error),
      });
    }
  }

  return <NotesContext.Provider value={{ notes, isLoading, isInitialLoaded, sync }}>{children}</NotesContext.Provider>;
}

export function useNotesContext() {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error("useNotesContext must be used within a NotesProvider");
  }
  return context;
}
