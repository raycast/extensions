// import { Action, ActionPanel, Detail, Form, List } from "@raycast/api";
// import { useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";

export default async () => {
  const options: Toast.Options = {
    style: Toast.Style.Success,
    title: "Finished cooking",
    message: "Delicious pasta for lunch",
    primaryAction: {
      title: "Do something",
      onAction: () => {
        console.log("The toast action has been triggered");
      },
    },
  };
  await showToast(options);
};
