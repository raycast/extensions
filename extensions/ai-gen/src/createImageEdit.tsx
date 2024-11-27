import { CreateImageForm, CreateImageValues } from "./components/CreateImageForm";

export default function Command(props: { draftValues?: CreateImageValues }) {
  return <CreateImageForm draftValues={props.draftValues} isEdit={true} />;
}
