import md from "markdown-it";

import html2pug from "html2pug";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      const html = md().render(value);
      return await html2pug(html, {
        fragment: !/^<!doctype/.test(value) || !/^<html/.test(value),
      });
    },
  });

  return <DefaultForm {...formProps} />;
};
