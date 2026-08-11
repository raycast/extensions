import { Action, ActionPanel, Form, Grid, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Artwork, fetchFeatured, getImageUrl, getThumbnailUrl, searchArtworks } from "./api";
import { computeFillRows, generateWallpaper, getScreenResolution, imageToAscii } from "./ascii";
import { type AutoWallpaperSettings, DEFAULTS, getAutoSettings, setAutoSettings } from "./auto-settings";
import { setWallpaper } from "./wallpaper";

export default function SearchArtworks() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Load featured artworks on mount
  useEffect(() => {
    (async () => {
      try {
        const featured = await fetchFeatured();
        setArtworks(featured);
      } catch {
        // silent fail, user can still search
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const search = useCallback(async (text: string) => {
    if (!text || text.length < 2) {
      // Reset to featured when search is cleared
      if (!text) {
        setIsSearching(true);
        try {
          const featured = await fetchFeatured();
          setArtworks(featured);
        } catch {
          // ignore
        } finally {
          setIsSearching(false);
        }
      }
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchArtworks(text, 20);
      setArtworks(results);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: String(error),
      });
    } finally {
      setIsSearching(false);
    }
  }, []);

  return (
    <Grid
      columns={4}
      aspectRatio="3/4"
      fit={Grid.Fit.Fill}
      isLoading={isLoading || isSearching}
      onSearchTextChange={search}
      searchBarPlaceholder="Search artworks... (e.g. Monet, Van Gogh, starry night)"
      throttle
    >
      <Grid.EmptyView title="No Artworks Found" description="Try a different search term" />
      {artworks.map((artwork) => (
        <Grid.Item
          key={artwork.objectID}
          content={getThumbnailUrl(artwork)}
          title={artwork.title}
          subtitle={artwork.artistDisplayName}
          actions={
            <ActionPanel>
              <Action.Push
                title="Configure Wallpaper"
                icon={Icon.Cog}
                target={<WallpaperSettings artwork={artwork} />}
              />
              <Action.OpenInBrowser
                title="View on Met Museum"
                url={`https://www.metmuseum.org/art/collection/search/${artwork.objectID}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

type ImageStatus = "loading" | "ready" | "error";

function WallpaperSettings({ artwork }: { artwork: Artwork }) {
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [settings, setSettings] = useState<AutoWallpaperSettings | null>(null);
  const [imageStatus, setImageStatus] = useState<ImageStatus>("loading");
  const settingsRef = useRef<AutoWallpaperSettings | null>(null);
  const imageBufferRef = useRef<Buffer | null>(null);
  const { pop } = useNavigation();
  const isLoading = isSettingsLoading || imageStatus === "loading";
  const canSubmit = settings !== null && imageStatus === "ready";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedSettings = await getAutoSettings();
        if (!cancelled) {
          settingsRef.current = savedSettings;
          setSettings(savedSettings);
        }
      } catch (error) {
        if (!cancelled) {
          settingsRef.current = DEFAULTS;
          setSettings(DEFAULTS);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load settings",
            message: String(error),
          });
        }
      } finally {
        if (!cancelled) {
          setIsSettingsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artwork.objectID]);

  useEffect(() => {
    let cancelled = false;
    imageBufferRef.current = null;
    setImageStatus("loading");

    (async () => {
      try {
        const imageUrl = getImageUrl(artwork);
        if (!imageUrl) throw new Error("No image available");
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error("Failed to fetch image");
        const imageBuffer = Buffer.from(await response.arrayBuffer());

        if (!cancelled) {
          imageBufferRef.current = imageBuffer;
          setImageStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setImageStatus("error");
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load image",
            message: String(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [artwork.objectID]);

  const persistSettings = useCallback(async (nextSettings: AutoWallpaperSettings) => {
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    try {
      await setAutoSettings(nextSettings);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save settings",
        message: String(error),
      });
    }
  }, []);

  const handleSubmit = async (values: AutoWallpaperSettings) => {
    await persistSettings(values);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating wallpaper...",
    });
    try {
      if (!imageBufferRef.current) throw new Error("Image not loaded yet");

      const screen = await getScreenResolution();
      const density = parseInt(values.density, 10);
      const screenRows = computeFillRows(density, screen.width, screen.height);

      toast.title = "Converting to ASCII...";
      const result = await imageToAscii(imageBufferRef.current, density, screenRows, screen.width, screen.height);

      toast.title = "Rendering characters...";
      const wallpaperPath = await generateWallpaper(result.ascii, result.colorGrid, {
        backgroundColor: values.backgroundColor,
        textColor: values.textColor,
        colorMode: values.colorMode,
        width: screen.width,
        height: screen.height,
      });

      toast.title = "Applying wallpaper...";
      await setWallpaper(wallpaperPath);

      toast.style = Toast.Style.Success;
      toast.title = "Wallpaper set!";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = String(error);
    }
  };

  if (!settings) return <Form isLoading={isLoading} />;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={artwork.title}
      actions={
        canSubmit ? (
          <ActionPanel>
            <Action.SubmitForm title="Set as Wallpaper" icon={Icon.Desktop} onSubmit={handleSubmit} />
          </ActionPanel>
        ) : undefined
      }
    >
      <Form.Description title="Artwork" text={`${artwork.title} — ${artwork.artistDisplayName}`} />

      {imageStatus === "error" ? (
        <Form.Description
          title="Artwork Image"
          text="The image could not be loaded. Go back and try another artwork."
        />
      ) : null}

      <Form.Separator />

      <Form.Dropdown
        id="colorMode"
        title="Color Mode"
        value={settings.colorMode}
        onChange={(value) => void persistSettings({ ...(settingsRef.current ?? settings), colorMode: value })}
      >
        <Form.Dropdown.Item value="mono" title="Monochrome" icon={Icon.Eye} />
        <Form.Dropdown.Item value="color" title="Original Colors" icon={Icon.EyeDropper} />
      </Form.Dropdown>

      <Form.Dropdown
        id="backgroundColor"
        title="Background"
        value={settings.backgroundColor}
        onChange={(value) => void persistSettings({ ...(settingsRef.current ?? settings), backgroundColor: value })}
      >
        <Form.Dropdown.Item value="#000000" title="Black" />
        <Form.Dropdown.Item value="#1a1a1a" title="Dark Gray" />
        <Form.Dropdown.Item value="#0a0a2e" title="Navy" />
        <Form.Dropdown.Item value="#0a1a0a" title="Dark Green" />
        <Form.Dropdown.Item value="#ffffff" title="White" />
      </Form.Dropdown>

      <Form.Dropdown
        id="textColor"
        title="Text Color"
        value={settings.textColor}
        onChange={(value) => void persistSettings({ ...(settingsRef.current ?? settings), textColor: value })}
      >
        <Form.Dropdown.Item value="#ffffff" title="White" />
        <Form.Dropdown.Item value="#00ff00" title="Green (Matrix)" />
        <Form.Dropdown.Item value="#ffbf00" title="Amber" />
        <Form.Dropdown.Item value="#00ffff" title="Cyan" />
        <Form.Dropdown.Item value="#ff3333" title="Red" />
      </Form.Dropdown>

      <Form.Dropdown
        id="density"
        title="Density"
        value={settings.density}
        onChange={(value) => void persistSettings({ ...(settingsRef.current ?? settings), density: value })}
      >
        <Form.Dropdown.Item value="100" title="Low — 100 chars/row" />
        <Form.Dropdown.Item value="200" title="Medium — 200 chars/row" />
        <Form.Dropdown.Item value="300" title="High — 300 chars/row" />
        <Form.Dropdown.Item value="400" title="Ultra — 400 chars/row" />
      </Form.Dropdown>
    </Form>
  );
}
