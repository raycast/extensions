import { Action, ActionPanel, Form, LaunchProps, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { CodesRequester } from "./api/codes";
import Style = Toast.Style;
import { FetchError } from "ofetch";
import { useHttpClient } from "./hooks/use-http-client";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CodeApply }>) {
  const args = props.arguments;

  const client = useHttpClient();
  const codes = new CodesRequester(client);

  const toast = await showToast({ title: "Applying code..", style: Style.Animated });
  try {
    await codes.apply(args.code, args.password);

    toast.style = Style.Success;
    toast.title = "Applied successfully!";

    await open("raycast://confetti");

    await popToRoot();
  } catch (e) {
    let message = "Unexpected error occurs";
    if (e instanceof FetchError) {
      message = e.message;

      const payload = e.response?._data;

      if (payload && payload.errors) {
        const errors = Object.values(payload.errors) as Array<Array<string>>;

        message = errors[0][0] || message;
      }
    }

    toast.title = "Error";
    toast.style = Style.Failure;
    toast.message = message;
  }
}
