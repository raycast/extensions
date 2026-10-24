import RequireOpenAIKey from "./components/RequireOpenAIKey";
import { CompleteTextForm, CompleteTextValues } from "./components/CompleteTextForm";

export default function Command(props: { draftValues?: CompleteTextValues }) {
  return (
    <RequireOpenAIKey>
      <CompleteTextForm draftValues={props.draftValues} />
    </RequireOpenAIKey>
  );
}
