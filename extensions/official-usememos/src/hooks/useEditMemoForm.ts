import { type Memo, updateMemo } from "../api/memo";
import { getMemosConnection } from "../helpers/preferences";
import { useMemoForm } from "./useMemoForm";

export const useEditMemoForm = (memo: Memo, onUpdated: (memo: Memo) => void) =>
  useMemoForm({
    initialValues: { content: memo.content, visibility: memo.visibility },
    save: (draft) => updateMemo(getMemosConnection(), memo.name, draft),
    onSaved: onUpdated,
  });
