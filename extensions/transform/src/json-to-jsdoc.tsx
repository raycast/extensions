import { jsonToJSDoc } from "json-to-jsdoc";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      return jsonToJSDoc(value);
    },
  });

  return <DefaultForm {...formProps} />;
};
