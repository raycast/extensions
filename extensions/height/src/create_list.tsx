import CreateList from "@/components/CreateList";
import View from "@/components/View";
import { CreateListFormValues } from "@/types/list";

export default function Command({ draftValues }: { draftValues?: CreateListFormValues }) {
  return (
    <View>
      <CreateList draftValues={draftValues} />
    </View>
  );
}
