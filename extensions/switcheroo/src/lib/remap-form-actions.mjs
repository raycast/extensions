/**
 * Leave a failed edit and refresh the list rather than rebasing unsaved values
 * onto an entry that may have moved or been deleted in the meantime.
 * Nothing is discarded until the user explicitly chooses this action.
 *
 * @param {() => void} reload
 * @param {() => void} close
 */
export function createReloadRemapsAction(reload, close) {
  return {
    title: "Discard Edits and Reload",
    onAction: () => {
      close();
      reload();
    },
  };
}
