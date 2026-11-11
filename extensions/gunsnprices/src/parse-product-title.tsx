import { Action, ActionPanel, Detail, Form, Icon, Keyboard, LaunchProps, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useMemo } from "react";
import { parsePrice } from "./lib/format.ts";
import { fieldsTable, listingJson, listingMarkdown, parseListing } from "./lib/title.ts";

interface FormValues {
  title: string;
  price: string;
}

function ParsedDetail(props: { title: string; price?: string }) {
  const parsed = useMemo(() => parseListing(props.title, props.price), [props.title, props.price]);
  const caliber = parsed.info.calibers.length === 1 ? parsed.info.calibers[0] : undefined;
  return (
    <Detail
      markdown={listingMarkdown(parsed)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Specs" content={fieldsTable(parsed)} />
          <Action.CopyToClipboard title="Copy as JSON" content={listingJson(parsed)} />
          {caliber ? <Action.CopyToClipboard title="Copy Caliber Name" content={caliber.name} /> : null}
          {caliber?.url ? (
            <Action.OpenInBrowser
              title="Open Price Comparison"
              icon={Icon.Globe}
              url={caliber.url}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function TitleForm(props: { title?: string; price?: string }) {
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { title: props.title ?? "", price: props.price ?? "" },
    validation: {
      title: FormValidation.Required,
      price: (value) => (value && parsePrice(value) === null ? "Type a price like 18.99" : undefined),
    },
    onSubmit: (values) => push(<ParsedDetail title={values.title} price={values.price} />),
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse Title" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Product Title"
        placeholder={'Glock 19 Gen 5 MOS 9mm 4.02" 15rd Pistol'}
        info="Paste the title as the store wrote it."
        {...itemProps.title}
      />
      <Form.TextField
        title="Price"
        placeholder="Optional, e.g. 18.99"
        info="With an ammo title, the price gives a cost per round."
        {...itemProps.price}
      />
    </Form>
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.ParseProductTitle }>) {
  const { title, price } = props.arguments;
  if (title && title.trim()) return <ParsedDetail title={title} price={price} />;
  return <TitleForm price={price} />;
}
