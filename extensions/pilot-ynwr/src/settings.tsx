import UseOAuth from "./fetch/useOAuth";
import SelectDBsForm from "./views/forms/SelectDBsForm";

export default function Command() {
  const { notion } = UseOAuth();

  return <SelectDBsForm notion={notion} />;
}
