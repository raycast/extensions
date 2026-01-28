import { stringify } from "@iarna/toml";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      return stringify(JSON.parse(value));
    },
  });

  return <DefaultForm {...formProps} />;
};
