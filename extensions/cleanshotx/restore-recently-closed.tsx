import {showToast, ToastStyle } from "@raycast/api";
import fetch  from 'node-fetch';

export default async() => {
  // send request to server
  const _ = await fetch("cleanshot://restore-recently-closed");

  await showToast(
    ToastStyle.Success,
    "Restore recently closed overlay",
  );
}
