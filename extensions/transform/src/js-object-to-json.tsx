import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      return JSON.stringify(eval("(" + value + ")"), null, 2);
    },
  });

  return <DefaultForm {...formProps} />;
};
