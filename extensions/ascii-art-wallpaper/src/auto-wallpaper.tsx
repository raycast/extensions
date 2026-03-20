import { ActionPanel, Action, Form, showToast, Toast, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { STORAGE_KEY, DEFAULTS, type AutoWallpaperSettings } from "./auto-settings";
import { fetchFeatured, getImageUrl } from "./api";
import { imageToAscii, generateWallpaper, computeFillRows, getScreenResolution } from "./ascii";
import { setWallpaper } from "./wallpaper";

export default function AutoWallpaper() {
  const [settings, setSettings] = useState<AutoWallpaperSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
      let s = DEFAULTS;
      if (raw) {
        try {
          s = { ...DEFAULTS, ...JSON.parse(raw) };
        } catch {
          /* use defaults */
        }
      }
      setSettings(s);
      setIsLoading(false);
    })();
  }, []);

  const handleSubmit = async (values: {
    colorMode: string;
    backgroundColor: string;
    textColor: string;
    density: string;
  }) => {
    const newSettings: AutoWallpaperSettings = {
      colorMode: values.colorMode,
      backgroundColor: values.backgroundColor,
      textColor: values.textColor,
      density: values.density,
    };

    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching random artwork...",
    });
    try {
      const artworks = await fetchFeatured();
      if (artworks.length === 0) throw new Error("No artworks available");

      const artwork = artworks[Math.floor(Math.random() * artworks.length)];
      const imageUrl = getImageUrl(artwork);
      if (!imageUrl) throw new Error("No image for selected artwork");

      toast.title = "Downloading image...";
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      const imageBuffer = Buffer.from(await response.arrayBuffer());

      toast.title = "Converting to ASCII...";
      const screen = await getScreenResolution();
      const density = parseInt(values.density, 10);
      const screenRows = computeFillRows(density, screen.width, screen.height);
      const result = await imageToAscii(imageBuffer, density, screenRows, screen.width, screen.height);

      toast.title = "Rendering wallpaper...";
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
      toast.message = `${artwork.title} — will change every hour`;
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
      navigationTitle="Auto ASCII Wallpaper"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
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
