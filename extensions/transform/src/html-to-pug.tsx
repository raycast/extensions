import html2pug from "html2pug";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) =>
      await html2pug(value, {
        fragment: !/^<!doctype/.test(value) || !/^<html/.test(value),
      }),
  });

  return <DefaultForm {...formProps} />;
};
