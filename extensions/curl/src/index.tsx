import { useNavigation } from "@raycast/api";
import FormView from "./views/Form";

export default function Command() {
  const { push } = useNavigation();

  return <FormView push={push} />;
}
