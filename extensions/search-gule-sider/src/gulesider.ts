import { open, showToast, Toast } from "@raycast/api";

export default async function main(props: { arguments: { query: string } }) {
  const query = props.arguments.query || "";
  if (query.trim() === "") {
    await showToast({ style: Toast.Style.Failure, title: "No query provided" });
    return;
  }

  let url: string;
  if (/^\d+$/.test(query.trim())) {
    // Phone number search
    url = `https://www.gulesider.no/${encodeURIComponent(query)}/hvem+har+ringt`;
  } else {
    // Name search
    url = `https://www.gulesider.no/${encodeURIComponent(query)}/personer`;
  }

  try {
    await open(url);
    await showToast({ style: Toast.Style.Success, title: "Opened in browser" });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to open URL", message: String(error) });
  }
}
