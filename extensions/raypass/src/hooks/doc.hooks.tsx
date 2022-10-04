import { usePromise } from "@raycast/utils";
import { popToRoot, showToast, Toast } from "@raycast/api";
import { docs, local } from "../utils";
import { documentStore } from "../context";

export const useDocuments = () => {
  return usePromise(
    async () => {
      const { activeRef, documents } = await docs.index();
      if (!activeRef) {
        const refs = await local.docs.refresh();
        return refs;
      }

      return documents;
    },
    [],
    {
      onError: async (err) => {
        console.log(err);
        await showToast(Toast.Style.Failure, "Error", "An error occurred while fetching documents.");
        popToRoot(); //? push to view instead?
      },
    }
  );
};

export const useActiveRef = () => {
  return usePromise(
    async () => {
      const ref = await local.docs.active();
      documentStore.setState({ ref, password: undefined });
      return ref;
    },
    [],
    {
      onError: async () => {
        await showToast(Toast.Style.Failure, "Failed to get active ref");
        return;
      },
    }
  );
};
