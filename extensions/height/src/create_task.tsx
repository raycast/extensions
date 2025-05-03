import CreateTask from "@/components/CreateTask";
import View from "@/components/View";
import { CreateTaskFormValues } from "@/types/task";

export default function Command({ draftValues }: { draftValues?: CreateTaskFormValues }) {
  return (
    <View>
      <CreateTask draftValues={draftValues} />
    </View>
  );
}
