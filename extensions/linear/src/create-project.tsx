import View from "./components/View";
import CreateProjectForm, { CreateProjectValues } from "./components/CreateProjectForm";

export default function Command({ draftValues }: { draftValues?: CreateProjectValues }) {
  return (
    <View>
      <CreateProjectForm draftValues={draftValues} />
    </View>
  );
}
