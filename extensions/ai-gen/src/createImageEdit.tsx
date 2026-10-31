import RequireOpenAIKey from "./components/RequireOpenAIKey";
import { CreateImageForm, CreateImageValues } from "./components/CreateImageForm";

export default function Command(props: { draftValues?: CreateImageValues }) {
  return (
    <RequireOpenAIKey>
      <CreateImageForm draftValues={props.draftValues} isEdit={true} />
    </RequireOpenAIKey>
  );
}
