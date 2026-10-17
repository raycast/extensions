import { showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import type { Memo, MemoDraft, MemoVisibility } from "../api/memo";
import { toErrorMessage } from "../helpers/errors";

export type MemoFormValues = { content: string; visibility: string };

type Options = {
  initialValues: MemoFormValues;
  save: (draft: MemoDraft) => Promise<Memo>;
  onSaved: (memo: Memo) => void;
};

export const useMemoForm = ({ initialValues, save, onSaved }: Options) =>
  useForm<MemoFormValues>({
    initialValues,
    validation: {
      content: (value) => (value == null || value.trim() === "" ? "Write something first" : undefined),
    },
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving memo…" });
      try {
        const memo = await save({ content: values.content, visibility: values.visibility as MemoVisibility });
        toast.style = Toast.Style.Success;
        toast.title = "Memo saved";
        onSaved(memo);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't save memo";
        toast.message = toErrorMessage(error);
      }
    },
  });

export type MemoFormState = ReturnType<typeof useMemoForm>;
