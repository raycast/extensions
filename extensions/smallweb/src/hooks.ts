import { LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export function useDirs() {
  const {
    data: dirs,
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    try {
      return JSON.parse((await LocalStorage.getItem<string>("dirs")) || "[]") as string[];
    } catch (e) {
      return [];
    }
  }, []);

  return {
    dirs,
    setDirs: async (dirs: string[]) => {
      await LocalStorage.setItem("dirs", JSON.stringify(dirs));
      await revalidate();
    },
    isLoading,
    error,
  };
}
