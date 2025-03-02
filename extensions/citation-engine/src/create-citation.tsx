import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
  Keyboard,
  popToRoot,
} from "@raycast/api";
import React, { useCallback, useState, ReactNode } from "react";
import { Author, saveCitation } from "./utils/storage";
import { extractInformationFromUrl } from "./utils/url-extractor";
import { formatCitation } from "./utils/formatter";

interface CitationFormValues {
  title: string;
  authorFirstName: string;
  authorLastName: string;
  additionalAuthors: string;
  publisher: string;
  publicationDate: Date | null;
  url: string;
  journalName: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  citationStyle: string;
  type: string;
}

interface Preferences {
  defaultCitationStyle: string;
}

interface ManualEntryFormProps {
  initialValues?: Partial<CitationFormValues>;
}

export default function Command() {
  // Default directly to URL entry form instead of selection screen
  return <UrlEntryForm />;
}

function UrlEntryForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const handleSubmit = useCallback(
    async (values: { url: string }) => {
      try {
        setIsLoading(true);
        const url = values.url.trim();

        if (!url) {
          await showToast({
            style: Toast.Style.Failure,
            title: "URL is required",
          });
          return;
        }

        await showToast({
          style: Toast.Style.Animated,
          title: "Processing URL",
          message: "Extracting citation information...",
        });

        const extractedInfo = await extractInformationFromUrl(url);

        if (!extractedInfo) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to extract information",
            message: "Please try manual entry instead",
          });
          return;
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Information extracted",
          message: "Please verify the details",
        });

        // Pre-fill the form with extracted information
        const publicationDate = extractedInfo.publicationDate ? new Date(extractedInfo.publicationDate) : null;

        // Get only the first author for the main form fields
        const firstAuthor = extractedInfo.authors[0] || { firstName: "", lastName: "" };

        // Format additional authors - exclude the first one
        const additionalAuthors = extractedInfo.authors
          .slice(1)
          .map((author) => `${author.firstName} ${author.middleName ? author.middleName + " " : ""}${author.lastName}`)
          .join("; ");

        const form = (
          <ManualEntryForm
            initialValues={{
              title: extractedInfo.title,
              authorFirstName: firstAuthor.firstName,
              authorLastName: firstAuthor.lastName,
              additionalAuthors,
              publisher: extractedInfo.publisher || "",
              publicationDate: publicationDate,
              url,
              journalName: extractedInfo.journalName || "",
              volume: extractedInfo.volume || "",
              issue: extractedInfo.issue || "",
              pages: extractedInfo.pages || "",
              doi: extractedInfo.doi || "",
              type: extractedInfo.type,
            }}
          />
        );
        push(form as unknown as ReactNode);
      } catch (error) {
        console.error("Error processing URL:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error processing URL",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [push]
  );

  const renderActions = () => (
    <ActionPanel>
      <Action.SubmitForm
        title="Extract Information"
        onSubmit={handleSubmit}
        shortcut={{ modifiers: [], key: "return" }}
      />
      <Action
        title="Manual Entry"
        onAction={() => {
          const form = <ManualEntryForm />;
          push(form as unknown as ReactNode);
        }}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    </ActionPanel>
  );

  return (
    <Form isLoading={isLoading} actions={renderActions() as unknown as ReactNode}>
      <Form.Description
        title="Enter Website URL"
        text="Enter the URL of the article, blog post, or webpage you want to cite. We'll attempt to extract the relevant information automatically."
      />
      <Form.TextField id="url" title="URL" placeholder="https://example.com/article" autoFocus={true} />
    </Form>
  );
}

function ManualEntryForm({ initialValues }: ManualEntryFormProps) {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [formValues, setFormValues] = useState<Partial<CitationFormValues>>(
    initialValues || {
      title: "",
      authorFirstName: "",
      authorLastName: "",
      additionalAuthors: "",
      publisher: "",
      publicationDate: null,
      url: "",
      journalName: "",
      volume: "",
      issue: "",
      pages: "",
      doi: "",
      citationStyle: preferences.defaultCitationStyle || "apa",
      type: "website",
    }
  );

  const handleSubmit = useCallback(async (values: CitationFormValues) => {
    try {
      setIsLoading(true);

      // Process form values and create citation
      const authors: Author[] = [
        {
          firstName: values.authorFirstName,
          lastName: values.authorLastName,
        },
      ];

      // Process additional authors if any
      if (values.additionalAuthors) {
        const additionalAuthorsList = values.additionalAuthors.split(";").map((author) => author.trim());

        for (const authorFullName of additionalAuthorsList) {
          const nameParts = authorFullName.split(" ");
          if (nameParts.length >= 2) {
            const lastName = nameParts.pop() || "";
            const firstName = nameParts.join(" ");
            authors.push({ firstName, lastName });
          }
        }
      }

      const today = new Date().toISOString();

      const citation = {
        title: values.title,
        authors,
        publisher: values.publisher,
        publicationDate: values.publicationDate ? values.publicationDate.toISOString() : undefined,
        url: values.url,
        journalName: values.journalName,
        volume: values.volume,
        issue: values.issue,
        pages: values.pages,
        doi: values.doi,
        citationStyle: values.citationStyle as "apa" | "mla" | "chicago" | "harvard",
        type: values.type as "website" | "book" | "journal" | "newspaper",
        accessDate: today,
        id: "",
        createdAt: new Date().toISOString(),
        formattedCitation: "",
      };

      const formattedCitation = formatCitation(citation);

      await saveCitation({
        ...citation,
        formattedCitation,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Citation saved",
        message: "The citation has been saved successfully",
      });

      await Clipboard.copy(formattedCitation);

      await showToast({
        style: Toast.Style.Success,
        title: "Citation copied to clipboard",
      });

      // Pop back to root after citation is copied
      await popToRoot();
    } catch (error) {
      console.error("Error saving citation:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save citation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderActions = () => (
    <ActionPanel>
      <Action.SubmitForm title="Save Citation" onSubmit={handleSubmit} shortcut={{ modifiers: [], key: "return" }} />
    </ActionPanel>
  );

  const renderSourceTypeDropdown = () => (
    <Form.Dropdown
      id="type"
      title="Source Type"
      value={formValues.type}
      onChange={(type) => setFormValues((prev) => ({ ...prev, type }))}
    >
      <Form.Dropdown.Item value="website" title="Website" />
      <Form.Dropdown.Item value="book" title="Book" />
      <Form.Dropdown.Item value="journal" title="Journal Article" />
      <Form.Dropdown.Item value="newspaper" title="Newspaper Article" />
    </Form.Dropdown>
  );

  const renderCitationStyleDropdown = () => (
    <Form.Dropdown
      id="citationStyle"
      title="Citation Style"
      value={formValues.citationStyle}
      onChange={(citationStyle) => setFormValues((prev) => ({ ...prev, citationStyle }))}
    >
      <Form.Dropdown.Item value="apa" title="APA (7th Ed.)" />
      <Form.Dropdown.Item value="mla" title="MLA (9th Ed.)" />
      <Form.Dropdown.Item value="chicago" title="Chicago (17th Ed.)" />
      <Form.Dropdown.Item value="harvard" title="Harvard" />
    </Form.Dropdown>
  );

  return (
    <Form isLoading={isLoading} actions={renderActions() as unknown as ReactNode}>
      <Form.Description title="Citation Details" text="Enter the details of the source you're citing." />

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Title of the work"
        value={formValues.title}
        onChange={(title) => setFormValues((prev) => ({ ...prev, title }))}
      />

      {renderSourceTypeDropdown()}

      <Form.Separator />

      <Form.TextField
        id="authorFirstName"
        title="Author First Name"
        placeholder="First name of the primary author"
        value={formValues.authorFirstName}
        onChange={(authorFirstName) => setFormValues((prev) => ({ ...prev, authorFirstName }))}
      />

      <Form.TextField
        id="authorLastName"
        title="Author Last Name"
        placeholder="Last name of the primary author"
        value={formValues.authorLastName}
        onChange={(authorLastName) => setFormValues((prev) => ({ ...prev, authorLastName }))}
      />

      <Form.TextField
        id="additionalAuthors"
        title="Additional Authors"
        placeholder="e.g., Jane Smith; Alex Johnson"
        info="Separate multiple authors with semicolons"
        value={formValues.additionalAuthors}
        onChange={(additionalAuthors) => setFormValues((prev) => ({ ...prev, additionalAuthors }))}
      />

      <Form.DatePicker
        id="publicationDate"
        title="Publication Date"
        value={formValues.publicationDate ? new Date(formValues.publicationDate) : undefined}
        onChange={(publicationDate) => setFormValues((prev) => ({ ...prev, publicationDate }))}
      />

      <Form.Separator />

      <Form.TextField
        id="publisher"
        title="Publisher"
        placeholder="e.g., Oxford University Press"
        value={formValues.publisher}
        onChange={(publisher) => setFormValues((prev) => ({ ...prev, publisher }))}
      />

      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/article"
        value={formValues.url}
        onChange={(url) => setFormValues((prev) => ({ ...prev, url }))}
      />

      <Form.TextField
        id="journalName"
        title="Journal/Newspaper Name"
        placeholder="e.g., Journal of Science"
        value={formValues.journalName}
        onChange={(journalName) => setFormValues((prev) => ({ ...prev, journalName }))}
      />

      <Form.TextField
        id="volume"
        title="Volume"
        placeholder="e.g., 42"
        value={formValues.volume}
        onChange={(volume) => setFormValues((prev) => ({ ...prev, volume }))}
      />

      <Form.TextField
        id="issue"
        title="Issue"
        placeholder="e.g., 3"
        value={formValues.issue}
        onChange={(issue) => setFormValues((prev) => ({ ...prev, issue }))}
      />

      <Form.TextField
        id="pages"
        title="Pages"
        placeholder="e.g., 123-145"
        value={formValues.pages}
        onChange={(pages) => setFormValues((prev) => ({ ...prev, pages }))}
      />

      <Form.TextField
        id="doi"
        title="DOI"
        placeholder="e.g., 10.1000/xyz123"
        value={formValues.doi}
        onChange={(doi) => setFormValues((prev) => ({ ...prev, doi }))}
      />

      {renderCitationStyleDropdown()}
    </Form>
  );
}
