import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      if (!value) return value;
      return JSON.stringify(value);
    },
  });

  return <DefaultForm {...formProps} />;
};
