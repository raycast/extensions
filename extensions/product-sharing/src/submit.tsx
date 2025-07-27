import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { addServerProductShare, checkServerProductShareUrl, updateServerProductShare } from "./api/product-share";
import { getServerMetafy } from "./utils/metafy";

interface CommandProps {
  draftValues?: AddProduct;
  editProduct?: GetProduct;
  onProductChange?: () => Promise<void>;
}

export default function Command({ draftValues, editProduct, onProductChange }: CommandProps) {
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values, setValidationError, setValue, reset } = useForm<AddProduct>({
    initialValues: editProduct || draftValues,
    onSubmit: async (values) => {
      setSubmitting(true);
      await showToast({
        style: Toast.Style.Animated,
        title: editProduct ? "Updating..." : "Submitting...",
        message: "Please wait a moment.",
      });
      try {
        if (editProduct) {
          await updateServerProductShare({ ...values, id: editProduct.id, type: "product" } as GetProduct);
          await showToast({
            style: Toast.Style.Success,
            title: "Update Success",
          });
        } else {
          const { status } = await checkServerProductShareUrl(values.url);
          if (status === 409) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Submit Repeat",
              message: "The product already exists.",
            });
            return;
          }
          await addServerProductShare({ ...values, type: "product" });
          await showToast({
            style: Toast.Style.Success,
            title: "Submit Success",
          });
        }
        reset();
        if (onProductChange) {
          await onProductChange();
        }
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: editProduct ? "Update Failed" : "Submit Failed",
          message: (error as Error).message,
        });
      } finally {
        setSubmitting(false);
      }
    },
    validation: {
      url: (value) => {
        if (!value) {
          return "The url is required";
        } else if (!value.startsWith("https://")) {
          return "The url must start with https://";
        } else if (!value.match(/^(https?:\/\/)([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/)) {
          return "The url is not valid";
        }
      },
      title: FormValidation.Required,
      cover: (value) => {
        if (!value) {
          return "The Cover URL is required";
        } else if (!value.startsWith("https://")) {
          return "The Cover URL must start with https://";
        }
      },
      description: FormValidation.Required,
    },
  });

  const onGenerate = async () => {
    const url = values.url;
    if (!url) {
      setValidationError("url", "The url is required");
      return;
    } else if (!url.startsWith("https://")) {
      setValidationError("url", "The url must start with https://");
      return;
    } else if (!url.match(/^(https?:\/\/)([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/)) {
      setValidationError("url", "The url is not valid");
      return;
    }
    setGenerating(true);

    try {
      const { data } = await getServerMetafy(url);
      setValue("title", data?.title ?? "");
      setValue("cover", data?.image?.url ?? "");
      setValue("description", data?.description ?? "");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Auto Generate",
        message: (error as Error).message,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Form
      navigationTitle={editProduct ? "Edit Product" : "Submit Product"}
      enableDrafts={false}
      isLoading={submitting || generating}
      searchBarAccessory={<Form.LinkAccessory target="https://evanlong.me/share" text="Open Web" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={editProduct ? "Update Product" : "Submit Product"} onSubmit={handleSubmit} />
          <Action title="Auto Generate" shortcut={{ modifiers: ["cmd"], key: "g" }} onAction={onGenerate} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title="Target URL" placeholder="https://example.com" />
      <Form.Checkbox label="Recommended" {...itemProps.recommended} />
      <Form.Separator />
      <Form.TextField {...itemProps.title} title="Product Name" placeholder="Please enter the product name" />
      <Form.TextField {...itemProps.cover} title="Cover URL" placeholder="https://example.com/cover.jpg" />
      <Form.TextArea
        {...itemProps.description}
        title="Product Description"
        placeholder="Please enter the product description"
      />
    </Form>
  );
}
