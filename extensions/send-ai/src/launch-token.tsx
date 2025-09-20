import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { executeAction, uploadFile } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import { withAccessToken, useForm } from "@raycast/utils";
import { validateRequired } from "./utils/validation";
import fs from "fs";
import TokenLaunched from "./views/token-launched";

export interface LaunchTokenFormValues {
  name: string;
  ticker: string;
  description: string;
  image: string[]; // FilePicker returns an array of file paths
  amount: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

function LaunchTokenForm() {
  const [isLoading, setIsLoading] = useState(false);

  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<LaunchTokenFormValues>({
    async onSubmit(values) {
      if (isLoading) {
        return;
      }
      try {
        setIsLoading(true);
        // Prepare params
        const params: Record<string, string | number | undefined> = {
          name: values.name,
          symbol: values.ticker,
          description: values.description,
        };

        const file = values.image[0];
        const imageUrl = await uploadFile(file);
        params.imageUrl = imageUrl;

        params.amount = undefined;

        if (values.twitter) params.twitter = values.twitter;
        if (values.telegram) params.telegram = values.telegram;
        if (values.website) params.website = values.website;
        // Call API
        const response = await executeAction<{ mintAddress: string }>("launchMeteoraToken", params);
        const mintAddress = response.data?.mintAddress;

        if (!mintAddress) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Error launching token on Meteora",
          });
          return;
        }

        push(
          <TokenLaunched
            launchData={{
              name: values.name,
              ticker: values.ticker,
              description: values.description,
              image: values.image,
              twitter: values.twitter,
              telegram: values.telegram,
              website: values.website,
              amount: "0",
            }}
            mintAddress={mintAddress}
          />,
        );
        await showToast({ style: Toast.Style.Success, title: "Success", message: "Token launched successfully" });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : "Error launching token",
        });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      name: (value) => validateRequired(value, "name"),
      ticker: (value) => validateRequired(value, "ticker"),
      description: (value) => validateRequired(value, "description"),
      image: (value) => {
        if (!value || value.length === 0) {
          return "Please select an image file";
        }
        const file = value[0];
        if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
          return "Please select an image file";
        }
        // check if file is an image
        const imageType = file.split(".").pop();
        if (
          imageType !== "png" &&
          imageType !== "jpg" &&
          imageType !== "jpeg" &&
          imageType !== "gif" &&
          imageType !== "webp" &&
          imageType !== "svg"
        ) {
          return "Please select an image file";
        }
        const image = fs.readFileSync(file);
        // size of image
        const size = image.length;
        if (size > 1024 * 1024 * 1) {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Image size must be less than 1MB",
          });
          return "Image size must be less than 1MB";
        }
        return undefined;
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Launch Token" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="Enter token name" />
      <Form.TextField {...itemProps.ticker} title="Ticker" placeholder="Enter token ticker (symbol)" />
      <Form.TextArea {...itemProps.description} title="Description" placeholder="Enter token description" />
      <Form.FilePicker {...itemProps.image} allowMultipleSelection={false} canChooseFiles={true} title="Image" />
      <Form.TextField {...itemProps.twitter} title="Twitter" placeholder="Enter Twitter handle (optional)" />
      <Form.TextField {...itemProps.telegram} title="Telegram" placeholder="Enter Telegram handle (optional)" />
      <Form.TextField {...itemProps.website} title="Website" placeholder="Enter website URL (optional)" />
    </Form>
  );
}

export default withAccessToken(provider)(LaunchTokenForm);
