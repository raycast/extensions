import CreateList from "./components/CreateList";
import { withHeightAuth } from "./components/withHeightAuth";
import { CreateListFormValues } from "./types/list";

export default function Command({ draftValues }: { draftValues?: CreateListFormValues }) {
  return withHeightAuth(<CreateList draftValues={draftValues} />);
}
