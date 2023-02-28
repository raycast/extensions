import CreateList from "./components/CreateList";
import { CreateListFormValues } from "./types/list";

export default function Command({ draftValues }: { draftValues?: CreateListFormValues }) {
  return <CreateList draftValues={draftValues} />;
}
