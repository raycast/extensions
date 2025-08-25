import { ActionPanel, Action, Icon, List, Form, showToast, Toast, showHUD, LaunchProps } from "@raycast/api";
import { useState, useEffect } from "react";
import { URLValidator } from "./utils/validator";
import { SongLinkScraper } from "./utils/scraper";
import { ConvertedLink } from "./types";

/**
 * Interface for command arguments
 * URL is optional - if not provided, we show a form
 */
interface BopLinkArguments {
  url?: string;
}

type KeyboardKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/**
 * Main command component for BopLink
 * Handles both direct URL arguments and form input
 */
export default function Command(props: LaunchProps<{ arguments: BopLinkArguments }>) {
  // Add state for metadata
  const [inputUrl, setInputUrl] = useState<string>(props.arguments.url || "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [convertedLinks, setConvertedLinks] = useState<ConvertedLink[]>([]);
  const [metadata, setMetadata] = useState<{
    title?: string;
    type?: string;
    thumbnail?: string;
  } | null>(null);
  const [error, setError] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(!props.arguments.url);

  const [scraper] = useState(() => new SongLinkScraper());

  const handleConversion = async (url: string) => {
    setError("");
    setConvertedLinks([]);
    setMetadata(null); // Reset metadata

    const validation = URLValidator.validate(url);

    if (!validation.isValid) {
      setError(validation.error || "Invalid URL or not from a supported platform");
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: validation.error || "Please enter a valid streaming platform URL",
      });
      return;
    }

    if (!URLValidator.needsConversion(url)) {
      setError("This URL doesn't need conversion");
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "This appears to be a song.link URL already",
      });
      return;
    }

    setIsLoading(true);
    setShowForm(false);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Converting to available platforms...",
      });

      const result = await scraper.scrape(url);

      if (result.error) {
        setError(result.error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Conversion Failed",
          message: result.error,
        });
        setShowForm(true);
      } else if (result.links.length === 0) {
        setError("This content is not available on other platforms");
        await showToast({
          style: Toast.Style.Failure,
          title: "No Results",
          message: "This content is not available on other platforms",
        });
        setShowForm(true);
      } else {
        // Filter out the source platform from the results
        const filteredLinks = result.links.filter((link) => link.platform.id !== validation.platform?.id);
        setConvertedLinks(filteredLinks);
        setMetadata(result.metadata); // Store metadata

        // Update success message with song info if available
        const songInfo = result.metadata?.title ? `for ${result.metadata.title}` : "";

        await showToast({
          style: Toast.Style.Success,
          title: "Conversion Complete",
          message: `${songInfo}`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
      setShowForm(true);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Effect hook to handle initial URL argument
   * If URL was provided as argument, start conversion immediately
   */
  useEffect(() => {
    if (props.arguments.url) {
      handleConversion(props.arguments.url);
    }
  }, []);

  /**
   * Cleanup effect - close browser when component unmounts
   */
  useEffect(() => {
    return () => {
      scraper.close().catch(console.error);
    };
  }, [scraper]);

  /**
   * Handles copying a link to clipboard
   * Shows HUD notification with platform name
   */
  const handleCopyLink = async (link: ConvertedLink) => {
    await showHUD(`${link.platform.name} link copied!`);
  };

  /**
   * Renders the URL input form
   * Shown when no URL argument is provided or after an error
   */
  if (showForm && !isLoading) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Convert Link"
              icon={Icon.Link}
              onSubmit={(values) => {
                const url = values.url?.trim();
                if (url) {
                  setInputUrl(url);
                  handleConversion(url);
                } else {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "URL Required",
                    message: "Please enter a streaming platform URL",
                  });
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="url"
          title="Streaming Platform URL"
          placeholder="e.g., https://open.spotify.com/track/..."
          defaultValue={inputUrl}
          error={error || undefined}
          info="Enter a URL from Spotify, Apple Music, YouTube, or other supported platforms"
        />

        {/* Help text showing supported platforms */}
        <Form.Description
          title="Supported Platforms"
          text="Music: Spotify, Apple Music, YouTube, SoundCloud, Deezer, TIDAL, and more
Podcasts: Apple Podcasts → Google Podcasts, Overcast, Castbox, Pocket Casts"
        />
      </Form>
    );
  }

  /**
   * Main list view showing converted platform links
   * Each item shows platform name with icon and has copy/open actions
   */
  // Update the List view to show metadata
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search platforms..."
      // Add navigation title with song info if available
      navigationTitle={metadata?.title ? `${metadata.title}` : "BopLink"}
    >
      {/* Show loading state */}
      {isLoading && (
        <List.EmptyView
          title="Converting to available platforms..."
          description="Please wait while we fetch available links"
          icon={Icon.Download}
        />
      )}

      {/* Show converted links with metadata header */}
      {!isLoading && !error && convertedLinks.length > 0 && (
        <>
          {/* Add metadata section if available */}
          {metadata && metadata.title && (
            <List.Section
              title={metadata.title || "Unknown Title"}
              subtitle={[metadata.type ? `${metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1)}` : null]
                .filter(Boolean)
                .join(" • ")}
            />
          )}

          {convertedLinks.map((link, index) => (
            <List.Item
              key={link.platform.id}
              title={link.platform.name}
              subtitle={URLValidator.extractDomain(link.url)}
              icon={
                link.platform.icon
                  ? {
                      source: `${link.platform.icon}`,
                    }
                  : Icon.Music
              }
              accessories={[{ icon: Icon.Link, tooltip: "Copy link" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title={index < 9 ? `Copy Link (⌘${index + 1})` : "Copy Link"}
                    content={link.url}
                    icon={Icon.Clipboard}
                    shortcut={index < 9 ? { modifiers: ["cmd"], key: String(index + 1) as KeyboardKey } : undefined}
                    onCopy={() => handleCopyLink(link)}
                  />

                  <ActionPanel.Section>
                    <Action
                      title="Convert Another URL"
                      icon={Icon.RotateClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => {
                        setConvertedLinks([]);
                        setMetadata(null);
                        setInputUrl("");
                        setShowForm(true);
                      }}
                    />

                    {convertedLinks.length > 1 && (
                      <Action.CopyToClipboard
                        title="Copy All Links"
                        content={convertedLinks.map((l) => `${l.platform.name}: ${l.url}`).join("\n")}
                        icon={Icon.CopyClipboard}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        onCopy={() => showHUD("All links copied!")}
                      />
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}

          {/* Update summary section */}
          <List.Section
            title="Summary"
            subtitle={`Available on ${convertedLinks.length} platform${convertedLinks.length > 1 ? "s" : ""}`}
          />
        </>
      )}

      {/* Show empty state when no results after successful scrape */}
      {!isLoading && !error && convertedLinks.length === 0 && !showForm && (
        <List.EmptyView
          title="No Platforms Found"
          description="This content doesn't appear to be available on other platforms"
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action
                title="Try Another URL"
                icon={Icon.RotateClockwise}
                onAction={() => {
                  setShowForm(true);
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
