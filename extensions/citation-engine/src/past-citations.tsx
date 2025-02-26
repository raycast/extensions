import {
  ActionPanel,
  List,
  Action,
  showToast,
  Toast,
  Clipboard,
  confirmAlert,
  Icon,
  Alert,
  launchCommand,
  LaunchType,
  popToRoot,
} from "@raycast/api";
import React, { useCallback, useState, useMemo, ReactNode } from "react";
import { useCachedPromise } from "@raycast/utils";
import { Citation, getCitations, updateCitation, deleteCitation } from "./utils/storage";
import { formatCitation } from "./utils/formatter";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data: citations, isLoading, revalidate } = useCachedPromise(getCitations);

  const filteredCitations = useMemo(() => {
    if (!citations) return [];

    if (!searchText) return citations;

    const lowerSearchText = searchText.toLowerCase();

    return citations.filter((citation) => {
      // Search in title
      if (citation.title.toLowerCase().includes(lowerSearchText)) return true;

      // Search in authors
      const hasMatchingAuthor = citation.authors.some(
        (author) =>
          author.firstName.toLowerCase().includes(lowerSearchText) ||
          author.lastName.toLowerCase().includes(lowerSearchText)
      );
      if (hasMatchingAuthor) return true;

      // Search in publisher
      if (citation.publisher?.toLowerCase().includes(lowerSearchText)) return true;

      // Search in journal name
      if (citation.journalName?.toLowerCase().includes(lowerSearchText)) return true;

      // Search in formatted citation
      if (citation.formattedCitation.toLowerCase().includes(lowerSearchText)) return true;

      return false;
    });
  }, [citations, searchText]);

  const renderEmptyView = () => (
    <List.EmptyView
      icon={Icon.Document}
      title="No Citations Found"
      description={
        searchText ? "Try a different search term" : "Create your first citation with the 'Create Citation' command"
      }
      actions={
        <ActionPanel>
          <Action
            title="Create a New Citation"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              // Navigate to create citation command
              showToast({ style: Toast.Style.Success, title: "Opening Create Citation command" });
            }}
          />
        </ActionPanel>
      }
    />
  );

  const renderListItems = () =>
    filteredCitations.map((citation) => (
      <CitationListItem key={citation.id} citation={citation} onCitationUpdated={revalidate} />
    ));

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search citations by title, author, or content..."
      isShowingDetail
    >
      {filteredCitations.length === 0 ? (renderEmptyView() as unknown as ReactNode) : renderListItems()}
    </List>
  );
}

function CitationListItem({ citation, onCitationUpdated }: { citation: Citation; onCitationUpdated: () => void }) {
  const handleChangeCitationStyle = useCallback(
    async (style: string) => {
      try {
        const updatedCitation: Citation = {
          ...citation,
          citationStyle: style as "apa" | "mla" | "chicago" | "harvard",
          formattedCitation: formatCitation({
            ...citation,
            citationStyle: style as "apa" | "mla" | "chicago" | "harvard",
          }),
        };

        await updateCitation(updatedCitation);
        await showToast({ style: Toast.Style.Success, title: "Citation style updated" });
        onCitationUpdated();
      } catch (error) {
        console.error("Error updating citation style:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update citation style",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [citation, onCitationUpdated]
  );

  const handleCopyCitation = useCallback(async () => {
    await Clipboard.copy(citation.formattedCitation);
    await showToast({ style: Toast.Style.Success, title: "Citation copied to clipboard" });
    // Pop back to root after copying citation
    await popToRoot();
  }, [citation]);

  const handleDeleteCitation = useCallback(async () => {
    if (
      await confirmAlert({
        title: "Delete Citation",
        message: "Are you sure you want to delete this citation? This action cannot be undone.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteCitation(citation.id);
        await showToast({ style: Toast.Style.Success, title: "Citation deleted" });
        onCitationUpdated();
      } catch (error) {
        console.error("Error deleting citation:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete citation",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }, [citation, onCitationUpdated]);

  const isJournalOrNewspaper = citation.type === "journal" || citation.type === "newspaper";

  const detailMarkdown = `
  # ${citation.title}
  
  ## Formatted Citation
  
  ${citation.formattedCitation}
  
  ## Details
  
  - **Type:** ${citation.type}
  - **Authors:** ${citation.authors.map((a) => `${a.firstName} ${a.lastName}`).join(", ")}
  - **Publisher:** ${citation.publisher || "N/A"}
  - **Publication Date:** ${citation.publicationDate ? new Date(citation.publicationDate).toLocaleDateString() : "N/A"}
  ${isJournalOrNewspaper ? `- **Journal/Newspaper:** ${citation.journalName || "N/A"}` : ""}
  ${isJournalOrNewspaper ? `- **Volume:** ${citation.volume || "N/A"}` : ""}
  ${isJournalOrNewspaper ? `- **Issue:** ${citation.issue || "N/A"}` : ""}
  ${isJournalOrNewspaper ? `- **Pages:** ${citation.pages || "N/A"}` : ""}
  ${isJournalOrNewspaper && citation.doi ? `- **DOI:** ${citation.doi}` : ""}
  - **URL:** ${citation.url || "N/A"}
  - **Citation Style:** ${citation.citationStyle.toUpperCase()}
  - **Created:** ${new Date(citation.createdAt).toLocaleString()}
    `;

  // Get a short description of the citation for the subtitle
  const getSubtitle = () => {
    const authors = citation.authors.map((author) => `${author.lastName}, ${author.firstName.charAt(0)}.`).join(", ");
    const year = citation.publicationDate ? new Date(citation.publicationDate).getFullYear() : "n.d.";

    return `${authors} (${year})`;
  };

  // Get icon based on type
  const getTypeIcon = () => {
    switch (citation.type) {
      case "website":
        return Icon.Globe;
      case "book":
        return Icon.Book;
      case "journal":
        return Icon.Document;
      case "newspaper":
        return Icon.NewDocument;
      default:
        return Icon.Document;
    }
  };

  const renderDetail = () => <List.Item.Detail markdown={detailMarkdown} />;

  const renderActions = () => {
    const submenuActions = (
      <>
        <Action
          title="Apa (7th Ed.)"
          onAction={() => handleChangeCitationStyle("apa")}
          icon={citation.citationStyle === "apa" ? Icon.CheckCircle : Icon.Circle}
        />
        <Action
          title="Mla (9th Ed.)"
          onAction={() => handleChangeCitationStyle("mla")}
          icon={citation.citationStyle === "mla" ? Icon.CheckCircle : Icon.Circle}
        />
        <Action
          title="Chicago (17th Ed.)"
          onAction={() => handleChangeCitationStyle("chicago")}
          icon={citation.citationStyle === "chicago" ? Icon.CheckCircle : Icon.Circle}
        />
        <Action
          title="Harvard"
          onAction={() => handleChangeCitationStyle("harvard")}
          icon={citation.citationStyle === "harvard" ? Icon.CheckCircle : Icon.Circle}
        />
      </>
    );

    const deleteAction = (
      <Action
        title="Delete Citation"
        style={Action.Style.Destructive}
        onAction={handleDeleteCitation}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        icon={Icon.Trash}
      />
    );

    return (
      <ActionPanel>
        <Action title="Copy Citation" icon={Icon.Clipboard} onAction={handleCopyCitation} />

        <ActionPanel.Submenu title="Change Citation Style" icon={Icon.Text}>
          {submenuActions as unknown as ReactNode}
        </ActionPanel.Submenu>

        <Action
          title="Create New Citation"
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => {
            // Navigate to create citation command
            showToast({ style: Toast.Style.Success, title: "Opening Create Citation command" });
            launchCommand({ name: "create-citation", type: LaunchType.UserInitiated });
          }}
        />

        <ActionPanel.Section>{deleteAction as unknown as ReactNode}</ActionPanel.Section>
      </ActionPanel>
    );
  };

  return (
    <List.Item
      id={citation.id}
      title={citation.title}
      subtitle={getSubtitle()}
      icon={getTypeIcon()}
      detail={renderDetail() as unknown as ReactNode}
      actions={renderActions() as unknown as ReactNode}
    />
  );
}
