import { JSONtoYAML } from "@ultirequiem/y2j";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      return JSONtoYAML(value);
    },
  });

  return <DefaultForm {...formProps} />;
};
