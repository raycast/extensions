import { List, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";

const statusCodes: { [key: number]: string } = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
};

export default function Command() {
  const [items, setItems] = useState<{ code: number; description: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    setIsLoading(true);
    const newQuery = searchQuery.trim().toLowerCase();

    const newFilteredCodes = Object.entries(statusCodes)
      .filter(([code, description]) => code.includes(newQuery) || description.toLowerCase().includes(newQuery))
      .map(([code, description]) => ({
        code: parseInt(code),
        description,
      }));

    setItems(newFilteredCodes);
    setIsLoading(false);
  }, [searchQuery]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search HTTP status codes..." onSearchTextChange={setSearchQuery}>
      {items.map(({ code, description }) => (
        <List.Item
          key={code}
          id={code.toString()}
          title={`${code} ${description}`}
          actions={
            <ActionPanel>
              <Action
                title="Copy to Clipboard"
                onAction={async () => {
                  await Clipboard.copy(`${code} ${description}`);
                  await showToast(Toast.Style.Success, "HTTP status copied to clipboard");
                }}
              />
              <Action
                title="Log to Console"
                onAction={() => {
                  console.log("Selected:", code, description);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
