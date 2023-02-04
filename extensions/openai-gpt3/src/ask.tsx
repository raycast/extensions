import { useNavigation } from "@raycast/api";
import FormView from "./ask/form";

export default function Command() {
  const { push } = useNavigation();

  return <FormView push={push} />;
}
