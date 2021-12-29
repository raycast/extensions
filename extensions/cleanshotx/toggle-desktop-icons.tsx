import {showToast, ToastStyle } from "@raycast/api";
import fetch  from 'node-fetch';

export default async() => {
  // send request to server
  const _ = await fetch("cleanshot://toggle-desktop-icons");

  await showToast(
    ToastStyle.Success,
    "Toggle desktop icons visibility",
  );
}
