const baseUrl = "https://www.threads.net/intent/";

interface PostIntentParams {
  text?: string;
  attachment?: string;
}

export function constructPostIntent({
  text,
  attachment,
}: PostIntentParams): string {
  const intent = "post";
  const params = new URLSearchParams();

  if (attachment) params.append("url", attachment);
  if (text) params.append("text", text);

  return params.toString()
    ? `${baseUrl}${intent}?${params.toString()}`
    : baseUrl;
}
