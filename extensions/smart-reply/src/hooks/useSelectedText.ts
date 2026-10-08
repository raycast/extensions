import { getSelectedText, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export function useSelectedText() {
  const { data: selectedText, isLoading } = usePromise(
    async () => {
      return getSelectedText();
    },
    [],
    {
      onError: async (error) => {
        console.error("Error fetching selected text:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to get selected text",
        });
      },
    },
  );

  return { selectedText: selectedText || "", loading: isLoading };
}
