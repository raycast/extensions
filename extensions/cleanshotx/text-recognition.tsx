import {showToast, ToastStyle } from "@raycast/api";
import fetch  from 'node-fetch';

export default async() => {
  // send request to server
  const _ = await fetch("cleanshot://capture-text");

  await showToast(
    ToastStyle.Success,
    "Text recognition using OCR",
  );
}
