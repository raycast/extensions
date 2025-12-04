import { jsonToSchema } from "@walmartlabs/json-to-simple-graphql-schema/lib";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      return jsonToSchema({ jsonInput: value }).value;
    },
  });

  return <DefaultForm {...formProps} />;
};
