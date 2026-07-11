import { parse } from "@iarna/toml";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: (value: string) => {
      return JSON.stringify(parse(value));
    },
  });

  return <DefaultForm {...formProps} />;
};
