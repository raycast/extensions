import { YAMLtoJSON } from "@ultirequiem/y2j";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: (value: string) => {
      return YAMLtoJSON(value);
    },
  });

  return <DefaultForm {...formProps} />;
};
