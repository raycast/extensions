import { usePromise } from "@raycast/utils";
import { showToast, Toast, useNavigation } from "@raycast/api";
import { docs } from "../utils";
import { documentStore } from "../context";
import { Documents } from "../views";

export const useRecords = () => {
  const { push } = useNavigation();
  const { ref, password } = documentStore.getState();

  return usePromise(
    async (password: string | undefined) => {
      const { name, location, records } = await docs.get({ documentName: ref?.name as string, password });
      return { document: { name, location }, records };
    },
    [password],
    {
      onError: async (e) => {
        await showToast(Toast.Style.Failure, e.message ?? "Something went wrong", "Refresh cache and try again");
        return push(<Documents />);
      },
    }
  );
};
