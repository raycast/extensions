import { LaunchProps, open, showToast } from "@raycast/api";

export default function Command({ arguments: { query } }: LaunchProps) {
  const url = `https://unduck.link/search?q=${query}`;
  try {
    open(url);
  } catch (error) {
    showToast({ title: "Error", message: "Failed to open Unduck." });
  }
}
