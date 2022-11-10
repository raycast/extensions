import pug from "pug";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      const html = pug.compile(value)({});
      return new NodeHtmlMarkdown().translate(html);
    },
  });

  return <DefaultForm {...formProps} />;
};
