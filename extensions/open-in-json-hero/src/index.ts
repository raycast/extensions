import { Clipboard, open, showToast, Toast, getPreferenceValues, showHUD, LaunchProps } from "@raycast/api";

export default async function main(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const preferences = getPreferenceValues<Preferences>();
  const ttl = parseInt(props.arguments.ttl || preferences.ttl) || null;
  const title = props.arguments.title || "Untitled";

  const toast = await showToast(Toast.Style.Animated, "Reading from Clipboard");
  try {
    const text = await Clipboard.readText();
    if (!text) throw new Error("No text found in Clipboard");
    const json = JSON.parse(text);

    toast.title = "Uploading JSON";
    const document = await createNewDocument(title, json, ttl);

    await toast.hide();
    await showHUD("✅ Uploaded");
    await open(document.location);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    toast.style = Toast.Style.Failure;
    toast.title = "Something went wrong";
    toast.message = message;
  }
}

const getEndpoint = () => {
  const preferences = getPreferenceValues<Preferences>();
  const domain = preferences.domain || "https://jsonhero.io";

  const endpoint = new URL(domain);
  endpoint.pathname = "/api/create.json";
  endpoint.searchParams.append("utm_source", "raycast");

  return endpoint.toString();
};

async function createNewDocument(
  title: string,
  json: unknown,
  ttl: number | null,
): Promise<{ id: string; location: string }> {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      content: json,
      ttl,
    }),
  };

  const endpoint = getEndpoint();

  const response = await fetch(endpoint, options);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const jsonResponse = (await response.json()) as { id: string; location: string };
  if (!jsonResponse.id || !jsonResponse.location) throw new Error("Invalid response format");

  return jsonResponse;
}
