import { useForm } from "@raycast/utils";
import { executeSearchToOpen } from "./executeSearchToOpen";

export function useChatGptSearchForm() {
  return useForm({
    onSubmit: executeSearchToOpen,
    validation: {
      query: (value) => (value && value.trim().length > 0 ? null : "Query cannot be empty"),
    },
  });
}
