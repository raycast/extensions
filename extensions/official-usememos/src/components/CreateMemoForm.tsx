import { useNavigation } from "@raycast/api";
import { useCreateMemoForm } from "../hooks/useCreateMemoForm";
import { MemoDetail } from "./MemoDetail";
import { MemoForm } from "./MemoForm";

export const CreateMemoForm = () => {
  const { push } = useNavigation();
  const form = useCreateMemoForm((memo) => push(<MemoDetail memo={memo} />));
  return <MemoForm navigationTitle="Create Memo" submitTitle="Save Memo" form={form} />;
};
