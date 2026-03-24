import { ActionPanel, Action, Grid, Form, showToast, Toast, Icon, LocalStorage, useNavigation } from "@raycast/api";
import { useState, useCallback, useEffect, useRef } from "react";
import { searchArtworks, fetchFeatured, getThumbnailUrl, getImageUrl, type Artwork } from "./api";
import { imageToAscii, generateWallpaper, computeFillRows, getScreenResolution } from "./ascii";
import { setWallpaper } from "./wallpaper";
import { STORAGE_KEY, DEFAULTS, type AutoWallpaperSettings } from "./auto-settings";

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

interface FormValues {
  colorMode: string;
  backgroundColor: string;
  textColor: string;
  density: string;
}

function WallpaperSettings({ artwork }: { artwork: Artwork }) {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AutoWallpaperSettings>(DEFAULTS);
  const imageBufferRef = useRef<Buffer | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load saved settings and image in parallel
      const [rawSettings] = await Promise.all([
        LocalStorage.getItem<string>(STORAGE_KEY),
        (async () => {
          const imageUrl = getImageUrl(artwork);
          if (!imageUrl) throw new Error("No image available");
          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error("Failed to fetch image");
          imageBufferRef.current = Buffer.from(await response.arrayBuffer());
        })().catch((error) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load image",
            message: String(error),
          });
        }),
      ]);
      if (!cancelled) {
        if (rawSettings) {
          try {
            setSettings({ ...DEFAULTS, ...JSON.parse(rawSettings) });
          } catch {
            /* use defaults */
          }
        }
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artwork.objectID]);

  const handleSubmit = async (values: FormValues) => {
    // Save settings for next time
    await LocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        colorMode: values.colorMode,
        backgroundColor: values.backgroundColor,
        textColor: values.textColor,
        density: values.density,
      }),
    );

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

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={artwork.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set as Wallpaper" icon={Icon.Desktop} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Artwork" text={`${artwork.title} — ${artwork.artistDisplayName}`} />

      <Form.Separator />

      <Form.Dropdown id="colorMode" title="Color Mode" defaultValue={settings.colorMode}>
        <Form.Dropdown.Item value="mono" title="Monochrome" icon={Icon.Eye} />
        <Form.Dropdown.Item value="color" title="Original Colors" icon={Icon.EyeDropper} />
      </Form.Dropdown>

      <Form.Dropdown id="backgroundColor" title="Background" defaultValue={settings.backgroundColor}>
        <Form.Dropdown.Item value="#000000" title="Black" />
        <Form.Dropdown.Item value="#1a1a1a" title="Dark Gray" />
        <Form.Dropdown.Item value="#0a0a2e" title="Navy" />
        <Form.Dropdown.Item value="#0a1a0a" title="Dark Green" />
        <Form.Dropdown.Item value="#ffffff" title="White" />
      </Form.Dropdown>

      <Form.Dropdown id="textColor" title="Text Color" defaultValue={settings.textColor}>
        <Form.Dropdown.Item value="#ffffff" title="White" />
        <Form.Dropdown.Item value="#00ff00" title="Green (Matrix)" />
        <Form.Dropdown.Item value="#ffbf00" title="Amber" />
        <Form.Dropdown.Item value="#00ffff" title="Cyan" />
        <Form.Dropdown.Item value="#ff3333" title="Red" />
      </Form.Dropdown>

      <Form.Dropdown id="density" title="Density" defaultValue={settings.density}>
        <Form.Dropdown.Item value="100" title="Low — 100 chars/row" />
        <Form.Dropdown.Item value="200" title="Medium — 200 chars/row" />
        <Form.Dropdown.Item value="300" title="High — 300 chars/row" />
        <Form.Dropdown.Item value="400" title="Ultra — 400 chars/row" />
      </Form.Dropdown>
    </Form>
  );
}
