import {showToast, ToastStyle } from "@raycast/api";
import fetch  from 'node-fetch';

export default async() => {
  // send request to server
  const _ = await fetch("cleanshot://self-timer");

  await showToast(
    ToastStyle.Success,
    "Timer based screen capture",
  );
}
