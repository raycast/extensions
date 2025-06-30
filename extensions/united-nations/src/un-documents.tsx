import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import TurndownService from "turndown";
import { fetchUnDocuments } from "./api.js";
import { UnDocument } from "./types.js";

const turnDownService = new TurndownService();

export default function () {
  const [isLoading, setIsLoading] = useState(true);
  const [documentList, setDocumentList] = useState<UnDocument[]>([]);

  const loadDocuments = async () => {
    setIsLoading(true);
    const documents = await fetchUnDocuments();
    setDocumentList(documents);
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <List isShowingDetail isLoading={isLoading}>
      {documentList.map((document, index) => {
        const descriptionMarkdown = turnDownService.turndown(document.description);

        return (
          <List.Item
            key={`document-${index}`}
            title={document.title}
            accessories={[{ text: new Date(document.pubDate).toLocaleDateString() }]}
            detail={
              <List.Item.Detail
                markdown={[`# ${document.title}`, `*${document.link}*`, descriptionMarkdown].join("\n".repeat(2))}
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="View on Website" url={document.link} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
