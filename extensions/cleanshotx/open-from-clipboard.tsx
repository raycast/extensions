import {showToast, ToastStyle } from "@raycast/api";
import fetch  from 'node-fetch';

export default async() => {
  // send request to server
  const _ = await fetch("cleanshot://open-from-clipboard");

  await showToast(
    ToastStyle.Success,
    "Open image from clipboard",
  );
}
