import CreateProjectForm, { CreateProjectValues } from "./components/CreateProjectForm";
import View from "./components/View";

export default function Command({ draftValues }: { draftValues?: CreateProjectValues }) {
  return (
    <View>
      <CreateProjectForm draftValues={draftValues} />
    </View>
  );
}
