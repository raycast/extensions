import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";
import JSON5 from "json5";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      return JSON5.stringify(JSON.parse(value), null, 2);
    },
  });

  return <DefaultForm {...formProps} />;
};
