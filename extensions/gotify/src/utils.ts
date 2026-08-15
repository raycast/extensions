export function websocketEndpoint(httpEndpoint: string) {
  const url = new URL(httpEndpoint);
  url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
  return url;
}

export function endpointWithPath(endpoint: string | URL, path: string) {
  if (typeof endpoint === "string") {
    endpoint = new URL(endpoint);
  }
  endpoint.pathname = path;
  return endpoint;
}

export function authHeaders(token: string) {
  return {
    headers: {
      "X-Gotify-Key": token,
    },
  };
}
