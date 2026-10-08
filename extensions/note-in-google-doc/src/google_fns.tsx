import { getDateInLocaleFormat } from "./util";
import { checkTokenValidity, client } from "./auth";
import fetch, { Response } from "node-fetch";

export interface GoogleDoc {
  id: string;
  name: string;
  modifiedTime: string;
}

export enum FileSearchOperator {
  "equals",
  "contains",
}

async function handleInvalidResponse(response: Response) {
  if (!response.ok) {
    if (response.status > 400 && response.status !== 404) {
      // this will retrigger the authentication flow for unknown errors
      await client.removeTokens();
    }
    throw new Error(response.statusText);
  }
}

export async function searchForFileByTitle(
  title: string,
  fileSearchOperator: FileSearchOperator = FileSearchOperator.equals,
): Promise<GoogleDoc[]> {
  const params = new URLSearchParams();
  params.append(
    "q",
    `trashed = false and name ${fileSearchOperator === FileSearchOperator.equals ? "=" : "contains"} '${title}'`,
  );
  params.append("fields", "files(id, name, mimeType, iconLink, modifiedTime, webViewLink, webContentLink, size)");
  params.append("orderBy", "recency desc");
  params.append("pageSize", "20");

  const response = await fetch("https://www.googleapis.com/drive/v3/files?" + params.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  await handleInvalidResponse(response);
  const json = (await response.json()) as { files: GoogleDoc[] };

  return json.files.map((item) => ({
    id: item.id,
    name: item.name,
    modifiedTime: new Date(item.modifiedTime).toLocaleString(),
  }));
}

function formatTextToUpdate(originalText: string) {
  const currentDateTime = getDateInLocaleFormat();
  return `\n ${currentDateTime}\n ${originalText}\n`;
}

export async function addNotesToFile(noteContent: string, fileId: string) {
  const response = await fetch("https://docs.googleapis.com/v1/documents/" + fileId + ":batchUpdate", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    method: "post",
    body: JSON.stringify({
      requests: [
        {
          insertText: { endOfSegmentLocation: { segmentId: "" }, text: formatTextToUpdate(noteContent) },
        },
      ],
    }),
  });
  await handleInvalidResponse(response);
  const json = (await response.json()) as { documentId: string };
  return json;
}

export async function createDocument(fileName: string) {
  await checkTokenValidity();
  const response = await fetch("https://docs.googleapis.com/v1/documents", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
    method: "post",
    body: JSON.stringify({ title: fileName }),
  });

  await handleInvalidResponse(response);

  const json = (await response.json()) as { documentId: string; title: string };
  return {
    id: json.documentId,
    name: json.title,
    modifiedTime: getDateInLocaleFormat(),
  } as GoogleDoc;
}
