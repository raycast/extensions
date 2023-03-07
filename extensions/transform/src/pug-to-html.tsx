import pug from "pug";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      return pug.compile(value)();
    },
  });

  return <DefaultForm {...formProps} />;
};
