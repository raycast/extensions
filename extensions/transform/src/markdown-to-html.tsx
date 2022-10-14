import md from "markdown-it";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      return md().render(value);
    },
  });

  return <DefaultForm {...formProps} />;
};
