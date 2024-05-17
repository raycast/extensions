import { Color } from "@raycast/api";

export const statusCodeToColor = (status: string): Color => {
  return (
    {
      1: Color.Blue,
      2: Color.Green,
      3: Color.Yellow,
      4: Color.Orange,
      5: Color.Red,
    }[status[0]] || Color.Magenta
  );
};

export const getCodeGroupDescription = (firstDigit: string): string => {
  return (
    {
      1: "Informational response - the request was received, continuing process",
      2: "Successful - the request was successfully received, understood, and accepted",
      3: "Redirection - further action needs to be taken in order to complete the request",
      4: "Client error - the request contains bad syntax or cannot be fulfilled",
      5: "Server error - the server failed to fulfil an apparently valid request",
    }[firstDigit] || ""
  );
};

export const getCodeDocsUrl = (code: string): string => {
  const codesWithoutDocs = ["102", "207", "208", "226", "305", "421", "423", "424", "509"];

  if (codesWithoutDocs.includes(code)) {
    return "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status";
  }

  return `https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${code}`;
};
