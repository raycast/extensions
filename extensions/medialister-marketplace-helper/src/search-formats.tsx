import { Form, ActionPanel, Action, showToast, Toast, Detail, getSelectedText } from "@raycast/api";
import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";

interface FormatType {
  "@id": string;
  "@type": string;
  name: string;
}

interface Format {
  "@id": string;
  "@type": string;
  formatType: FormatType;
  price: string;
}

interface SeoMetric {
  "@id": string;
  "@type": string;
  ahrefsDr: number;
}

interface ApiResponse {
  "@context": string;
  "@id": string;
  "@type": string;
  id: string;
  name: string;
  formats: Format[];
  seoMetric: SeoMetric;
}

interface ApiErrorResponse {
  message: string;
}

export default function SearchFormats() {
  const [isLoading, setIsLoading] = useState(false);
  const [mediaData, setMediaData] = useState<ApiResponse | null>(null);
  const [currentURL, setCurrentURL] = useState<string>("");
  const [inputURL, setInputURL] = useState<string>("");

  useEffect(() => {
    const checkSelectedText = async () => {
      try {
        const selectedText = await getSelectedText();
        // Updated URL validation regex that includes query parameters
        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?(\?[^#]*)?(#.*)?$/;

        if (urlRegex.test(selectedText.trim())) {
          setInputURL(selectedText.trim());
        }
      } catch (error) {
        console.error("Error getting selected text:", error);
      }
    };

    checkSelectedText();
  }, []);

  const handleSubmit = async ({ mediaURL }: { mediaURL: string }) => {
    if (!mediaURL) {
      showToast(Toast.Style.Failure, "Please enter a URL");
      return;
    }

    // Format the URL
    let formattedURL = mediaURL.trim();

    try {
      // Create URL object to properly parse the URL
      const urlObject = new URL(formattedURL.startsWith("http") ? formattedURL : `https://${formattedURL}`);

      // Keep only the hostname
      formattedURL = urlObject.hostname;

      // Add https://
      formattedURL = `https://${formattedURL}`;
    } catch (error) {
      showToast(Toast.Style.Failure, "Invalid URL format");
      return;
    }

    setCurrentURL(formattedURL);
    setIsLoading(true);
    try {
      const encodedURL = encodeURIComponent(formattedURL);
      const { data } = await axios.get<ApiResponse>(
        `https://api.medialister.com/api/public/media_requests?search=${encodedURL}`,
      );

      if (!data || !data.seoMetric) {
        throw new Error("Invalid response format");
      }

      setMediaData(data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        showToast(
          Toast.Style.Failure,
          "Failed to fetch formats",
          axiosError.response?.data?.message || axiosError.message,
        );
      } else {
        showToast(Toast.Style.Failure, "Failed to fetch formats", "Unknown error occurred");
      }
      setMediaData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getFormatIdFromUrl = (url: string) => {
    const matches = url.match(/\/formats\/([^/]+)/);
    return matches ? matches[1] : null;
  };

  if (mediaData) {
    const formatsList = mediaData.formats
      .map((format) => {
        const formatId = getFormatIdFromUrl(format["@id"]);
        const formatUrl = `https://app.medialister.com/media/${formatId}`;
        return (
          `## ${format.formatType.name}\n\n` +
          `**Price:** $${format.price}\n\n` +
          `[Open on Medialister ↗](${formatUrl})\n\n` +
          `---\n\n`
        );
      })
      .join("");

    const markdown =
      `# Booking Options on Medialister\n\n` +
      `${mediaData.formats.length > 0 ? formatsList : "No booking options available on Medialister for this media"}\n\n`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Check Another Media" onAction={() => setMediaData(null)} />
            {mediaData.formats.map((format) => {
              const formatId = getFormatIdFromUrl(format["@id"]);
              return (
                <Action.OpenInBrowser
                  key={format["@id"]}
                  title={`Open ${format.formatType.name} Format Page`}
                  url={`https://app.medialister.com/media/${formatId}`}
                />
              );
            })}
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Available Formats" text={mediaData.formats.length.toString()} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Ahrefs Domain Rating"
              text={(mediaData.seoMetric?.ahrefsDr || "N/A").toString()}
            />
            <Detail.Metadata.Label title="Media Name" text={mediaData.name} />
            <Detail.Metadata.Link title="Media Website" target={currentURL} text={currentURL} />
          </Detail.Metadata>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check Media" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="mediaURL"
        title="Media Website"
        placeholder="Enter a media website to check"
        value={inputURL}
        onChange={setInputURL}
      />
    </Form>
  );
}
