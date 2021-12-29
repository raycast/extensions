import {showToast, ToastStyle } from "@raycast/api";
import fetch  from 'node-fetch';

export default async() => {
  // send request to server
  const _ = await fetch("cleanshot://capture-fullscreen");

  await showToast(
    ToastStyle.Success,
    "Fullscreen screenshot",
  );
}
