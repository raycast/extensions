import { OrgListProvider } from "./components/providers/OrgListProvider";
import MultiForce from "./components/MutiForce";

export default function Command() {
  //Wrap the MultiForce extension in a custom ContextProvider to provide
  //reducers for loadingState and handling updates to Orgs.
  return (
    <OrgListProvider>
      <MultiForce />
    </OrgListProvider>
  );
}
