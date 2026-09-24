import { useNavigation } from "@raycast/api";
import type { Memo } from "../api/memo";
import { useEditMemoForm } from "../hooks/useEditMemoForm";
import { MemoForm } from "./MemoForm";

type Props = { memo: Memo; onSaved: () => void };

export const EditMemoForm = ({ memo, onSaved }: Props) => {
  const { pop } = useNavigation();
  const form = useEditMemoForm(memo, () => {
    onSaved();
    pop();
  });
  return <MemoForm navigationTitle="Edit Memo" submitTitle="Save Changes" form={form} />;
};
