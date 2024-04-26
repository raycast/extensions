import { Color, Detail, List } from "@raycast/api";
import { Request, Response, ShowDetails } from "../types";

type extItem = { [key: string]: string };

const sourceCodeExtensions: extItem = {
  go: "go",
  rs: "rust",
  py: "python",
  js: "javascript",
  ts: "typescript",
  php: "php",
};

function renderStatus(data: Response): { value: string; color: Color } {
  if (data.StatusCode === 0) {
    return { value: data.StatusText, color: Color.Red };
  }

  let color: Color = Color.PrimaryText;

  if (data.StatusCode >= 500) {
    color = Color.Red;
  } else if (data.StatusCode >= 400) {
    color = Color.Yellow;
  } else if (data.StatusCode >= 300) {
    color = Color.Blue;
  } else if (data.StatusCode >= 200) {
    color = Color.Green;
  }

  return { value: `${data.StatusCode} ${data.StatusText}`, color: color };
}

function renderBody(item: Request): string {
  // console.log(item.LastResponse.Body.length)

  if (item.LastResponse.Body.length == 0) {
    return "";
  }

  if (item.LastResponse.Headers["content-type"] == "application/json") {
    return "```json\n" + item.LastResponse.Body + "\n```";
  }

  if (item.LastResponse.ImageURL.length > 0) {
    return `![image](${item.LastResponse.ImageURL})`;
  }

  for (const ext in sourceCodeExtensions) {
    if (item.URL.endsWith("." + ext)) {
      return "```" + sourceCodeExtensions[ext] + "\n" + item.LastResponse.Body + "\n```";
    }
  }

  // todo: limit body length?
  // if (data.Body.length > 1000) {
  //     return data.Body.substring(0, 1000) + '...'
  // }

  return item.LastResponse.Body;
}

function renderMetadata(item: Request) {
  return (
    <List.Item.Detail.Metadata>
      <Detail.Metadata.Label title="Status" text={renderStatus(item.LastResponse)} />
      <Detail.Metadata.Label title="Execution Time" text={item.LastResponse.ExecutionTime.toString() + " ms"} />
      <Detail.Metadata.Separator />
      {Object.keys(item.LastResponse.Headers).map((key, index) => (
        <List.Item.Detail.Metadata.Label key={"h" + index} title={key} text={`${item.LastResponse?.Headers[key]}`} />
      ))}
    </List.Item.Detail.Metadata>
  );
}

function RequestDetails(item: Request, showDetails: ShowDetails.Full | ShowDetails.Short) {
  if (item.LastResponse.StatusText.length === 0) {
    return null;
  }

  return (
    <List.Item.Detail
      markdown={renderBody(item)}
      metadata={showDetails === ShowDetails.Short ? null : renderMetadata(item)}
    />
  );
}

export default RequestDetails;
