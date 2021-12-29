import {showToast, ToastStyle } from "@raycast/api";
import fetch  from 'node-fetch';

export default async() => {
  // send request to server
  const _ = await fetch("cleanshot://record-screen");

  await showToast(
    ToastStyle.Success,
    "Record entire screen",
  );
}
