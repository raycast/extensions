import { createMemo, type Memo } from "../api/memo";
import { getDefaultVisibility, getMemosConnection } from "../helpers/preferences";
import { useMemoForm } from "./useMemoForm";

export const useCreateMemoForm = (onCreated: (memo: Memo) => void) =>
  useMemoForm({
    initialValues: { content: "", visibility: getDefaultVisibility() },
    save: (draft) => createMemo(getMemosConnection(), draft),
    onSaved: onCreated,
  });
