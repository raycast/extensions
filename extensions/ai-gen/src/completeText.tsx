import { CompleteTextForm, CompleteTextValues } from "./components/CompleteTextForm";

export default function Command(props: { draftValues?: CompleteTextValues }) {
  return <CompleteTextForm draftValues={props.draftValues} />;
}
