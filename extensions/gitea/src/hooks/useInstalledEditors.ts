import { useCachedPromise } from "@raycast/utils";
import { getApplications, getPreferenceValues } from "@raycast/api";
import { Editors, isEditorInstalled, type EditorInfo } from "../domain/editor";

export function useInstalledEditors() {
  const prefs = getPreferenceValues<Preferences>();

  const { data: installedEditors = [], isLoading } = useCachedPromise(
    async (): Promise<EditorInfo[]> => {
      const apps = await getApplications();

      return Editors.filter((editor) => {
        if (!isEditorInstalled(editor, apps)) return false;

        return prefs[editor.prefKey] ?? true;
      });
    },
    [],
    {
      initialData: [],
    },
  );

  return { installedEditors, isLoading };
}
