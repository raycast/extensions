import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      if (!value) return value;

      return JSON.parse(value);
    },
  });

  return <DefaultForm {...formProps} />;
};
