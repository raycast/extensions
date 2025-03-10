import { useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  environment,
  Grid,
  Icon,
  showHUD,
  Detail,
  Toast,
  showToast,
} from "@raycast/api";
import { readdirSync, statSync } from "fs";
import { basename, join, extname } from "path";
import { titleCase } from "title-case";
import colors from "../assets/colors.json";

/** Professional Brand Guidelines with Enhanced Formatting */
const BRAND_GUIDELINES = `
<img src="https://www.chirica.law/images/logo.svg" alt="CLO Logo" width="300"/>

|   **CHIRICA LAW OFFICE LLC**   |
|:------------------------------:|
| Brand Identity Excellence Framework |



> *Our identity system represents precision, innovation, and global leadership.*
> *These standards are non-negotiable to maintain our market position and recognition.*

---


### **CORE BRAND STANDARDS**

| No. | Standard | Definition |
|:---:|:---------|:-----------|
| 01 | **Space Architecture** | Maintain minimum clear space of **1/4 logo height** surrounding all logo applications to ensure optimal visual performance. |
| 02 | **Chromatic Integrity** | Official brand colors must be reproduced with exact specifications. Color alteration compromises our premium positioning. |
| 03 | **Dimensional Standards** | Print Media: minimum **1/4 inch**<br>Digital Interface: minimum **40px** |
| 04 | **Print Production** | Premium color reproduction is required for all applications. When unavoidable, approved monochromatic versions may be utilized. |
| 05 | **Structural Consistency** | The logo must be presented in its original form—distortion, rotation, or modification is strictly prohibited. |

### **Environmental Application**

- **Light environments**: Utilize transparent logo versions
- **Dark/complex environments**: Apply standard logo with white background field
- **Visual Autonomy**: The logo requires dedicated visual space—never allow overlap with other design elements
- **Component Integrity**: The wordmark and symbol constitute a unified identity element and must not be separated
- **Digital Implementation**: SVG format is preferred for all digital applications to ensure resolution independence
- **Governance Protocol**: All new brand applications require advance authorization from Brand Management

---

### **COLOR PALETTE**

| Name | Hex Code | Usage |
|:-----|:---------|:------|
| Victory Red | #dc2015 | Primary brand accent for key elements |
| Knowledgeable Blue | #1d3242 | Primary brand color for text and backgrounds |
| Background White | #FFFFFF | Clean backgrounds and negative space |



*For approval requests: [office@chirica.law](mailto:office@chirica.law)*

| **CONSISTENCY · PRECISION · RECOGNITION**  |
|:------------------------------:|

`;

type Color = {
  name: string;
  value: string;
};

/** Utility function to copy text to clipboard with feedback */
function copyToClipboardWithFeedback(content: string, title: string) {
  Clipboard.copy(content);
  showToast({
    style: Toast.Style.Success,
    title: "Copied to Clipboard",
    message: title,
  });
  closeMainWindow();
}

/** Utility function to copy file to clipboard with feedback */
function copyFileToClipboardWithFeedback(file: string) {
  Clipboard.copy({ file });
  showToast({
    style: Toast.Style.Success,
    title: "Copied to Clipboard",
    message: basename(file),
    primaryAction: {
      title: "View Asset",
      onAction: () => {
        showHUD(`Opening ${basename(file)}`);
      },
    },
  });
  closeMainWindow();
}

/**
 * TOP-LEVEL COMMAND:
 * Immediately shows visually appealing brand guidelines.
 * Pressing Return goes to brand assets; a secondary action copies guidelines.
 */
export default function Command() {
  const [showAssets, setShowAssets] = useState(false);

  // 1) Show guidelines first
  if (!showAssets) {
    return (
      <Detail
        markdown={BRAND_GUIDELINES}
        actions={
          <ActionPanel>
            <Action title="View Brand Assets" icon={Icon.Image} onAction={() => setShowAssets(true)} />
            <Action.CopyToClipboard title="Copy Guidelines" content={BRAND_GUIDELINES} />
          </ActionPanel>
        }
      />
    );
  }

  // 2) If user chooses to view brand assets show them
  return <BrandAssetsView />;
}

/**
 * Shows the brand assets in a Grid layout
 */
function BrandAssetsView() {
  const dirs = readdirSync(environment.assetsPath)
    .map((item) => join(environment.assetsPath, item))
    .filter((item) => statSync(item).isDirectory());

  return (
    <Grid columns={6} searchBarPlaceholder="Search brand assets, colors, and more...">
      {/* Firm Slogan Section */}
      <Grid.Section title="Firm Slogan" subtitle="Official Brand Positioning" columns={3}>
        <Grid.Item
          title=""
          keywords={["slogan", "brand", "positioning", "motto", "tagline", "mission"]}
          content={join(environment.assetsPath, "wordmarks", "slogan.png")}
          actions={
            <ActionPanel>
              <Action
                title="Copy Slogan Text"
                icon={Icon.Text}
                onAction={() =>
                  copyToClipboardWithFeedback(
                    "High-Powered Chicago Commercial Litigation Firm, Using Technology and Cutting-Edge Resources to Zealously Advocate for Clients.",
                    "Firm Slogan"
                  )
                }
              />
              <Action
                title="Copy Slogan Image"
                icon={Icon.Image}
                onAction={() =>
                  copyFileToClipboardWithFeedback(join(environment.assetsPath, "wordmarks", "slogan.png"))
                }
              />
              <Action
                title="Reveal in Finder"
                icon={Icon.Finder}
                onAction={() => {
                  const filePath = join(environment.assetsPath, "wordmarks", "slogan.png");
                  showHUD(`Opening ${basename(filePath)} in Finder`);
                  Clipboard.copy({ file: filePath });
                }}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            </ActionPanel>
          }
        />
      </Grid.Section>

      {/* Brand Colors Section */}
      <Grid.Section title="Brand Colors" subtitle="Official Color Palette" columns={3}>
        {colors.map((color) => (
          <ColorItem key={color.name} color={color} />
        ))}
      </Grid.Section>

      {/* Organized Asset Directory Sections */}
      {dirs.map((dir) => {
        const dirName = basename(dir).toLowerCase();

        // Special handling for "logos" directory
        if (dirName === "logos") {
          return <LogoDirectoryWithGroups key={dir} dir={dir} />;
        }

        // Handle other directories normally
        return <DirectorySection key={dir} dir={dir} />;
      })}
    </Grid>
  );
}

/**
 * Organizes logos by use-case groups with descriptive captions
 */
function LogoDirectoryWithGroups(props: { dir: string }) {
  const files = readdirSync(props.dir)
    .map((item) => join(props.dir, item))
    .filter((item) => statSync(item).isFile() && basename(item) !== ".DS_Store");

  // Group 1: Vector files (SVG)
  const vectorFiles = files.filter((file) => extname(file).toLowerCase() === ".svg");

  // Group 2: Standard PNG logos
  const standardLogoFiles = files.filter((file) => {
    const name = basename(file).toLowerCase();
    const ext = extname(file).toLowerCase();
    return (
      ext === ".png" &&
      (name.includes("clo logo") ||
        name.includes("logo transparent") ||
        name.includes("textured logo") ||
        name.includes("square logo"))
    );
  });

  // Group 3: Special-use logos
  const specialUseFiles = files.filter((file) => {
    const name = basename(file).toLowerCase();
    const ext = extname(file).toLowerCase();
    return (
      ext === ".png" &&
      (name.includes("app") ||
        name.includes("button") ||
        name.includes("chirica design") ||
        name.includes("apple business"))
    );
  });

  return (
    <>
      <Grid.Section
        title="Vector Logo Files"
        subtitle="Full Resolution Source Files (Preferred whenever possible)"
        columns={2}
      >
        {vectorFiles
          .sort((a, b) => {
            const aName = basename(a).toLowerCase();
            const bName = basename(b).toLowerCase();
            // Show White Background SVG first
            if (aName.includes("white background")) return -1;
            if (bName.includes("white background")) return 1;
            return 0;
          })
          .map((file) => (
            <FileItem key={file} file={file} />
          ))}
      </Grid.Section>

      <Grid.Section
        title="Standard Brand Logos"
        subtitle="Primary Company Identity (Websites Documents etc.)"
        columns={3}
      >
        {standardLogoFiles.map((file) => (
          <FileItem key={file} file={file} />
        ))}
      </Grid.Section>

      <Grid.Section
        title="Special Use Case Logos"
        subtitle="Platform-Specific & Unique Requirements (App Stores Badges etc.)"
        columns={5}
      >
        {specialUseFiles.map((file) => (
          <FileItem key={file} file={file} />
        ))}
      </Grid.Section>
    </>
  );
}

/**
 * Standard directory section for non-logo directories
 */
function DirectorySection(props: { dir: string }) {
  const dirName = basename(props.dir);
  const files = readdirSync(props.dir)
    .map((item) => join(props.dir, item))
    .filter((item) => statSync(item).isFile() && basename(item) !== ".DS_Store");

  if (files.length === 0) return null;

  // Count assets for the subtitle
  const assetCount = files.length;
  const assetCountText = `${assetCount} ${assetCount === 1 ? "Asset" : "Assets"}`;

  let subtitle = assetCountText;
  if (dirName.toLowerCase() === "wordmarks") {
    subtitle = "Text-based Brand Identity (Letterheads, Formal Communications)";
  } else if (dirName.toLowerCase() === "screenshots") {
    subtitle = "Product Visuals (Marketing Materials, Documentation)";
  }

  // Adjust columns for wordmarks
  const columns = dirName.toLowerCase() === "wordmarks" ? 3 : 2;

  return (
    <Grid.Section title={titleCase(dirName)} subtitle={subtitle} columns={columns}>
      {files.map((file) => (
        <FileItem key={file} file={file} />
      ))}
    </Grid.Section>
  );
}

/**
 * Renders an individual file (image, vector, etc.) as a Grid item
 */
function FileItem(props: { file: string }) {
  const fileName = basename(props.file);
  const fileExt = extname(props.file).toLowerCase();
  const isImage = [".png", ".jpg", ".jpeg", ".svg", ".gif"].includes(fileExt);

  // Directory name for keywords
  const dirName = basename(props.file.split("/").slice(-2)[0]);
  const fileNameWithoutExt = fileName.replace(fileExt, "");

  // Improved naming for known assets
  const improvedNames: { [key: string]: { title: string; description: string } } = {
    "CLO Logo": {
      title: "Primary Logo",
      description: "Standard color logo for primary use",
    },
    "CLO Logo Transparent": {
      title: "Transparent Logo",
      description: "Logo with transparent background",
    },
    "CLO Logo White Background": {
      title: "White Background Logo (SVG)",
      description: "Vector logo with solid background",
    },
    "CLO Logo Tight Crop": {
      title: "Tight Crop Logo",
      description: "Closely cropped for compact spaces",
    },
    "CLO Chirica Design Only": {
      title: "Emblem Only",
      description: "Logo mark without text",
    },
    "CLO Button with Shadow": {
      title: "3D Logo with Shadow",
      description: "Dimensional logo for premium applications",
    },
    "CLO Textured Logo with Transparency": {
      title: "Textured Logo",
      description: "High-detail textured variant for print",
    },
    "CLO Square App Icon": {
      title: "App Icon",
      description: "Square format for application icons",
    },
    "CLO App Store Icon": {
      title: "App Store Icon",
      description: "Optimized for store listings",
    },
    "Apple Business Logo": {
      title: "Apple Business Badge",
      description: "For Apple Business integration",
    },
    slogan: {
      title: "Firm Slogan Banner",
      description: "Official positioning statement",
    },
    Transparent: {
      title: "Transparent Wordmark",
      description: "Text-based logo with transparency",
    },
    Wide: {
      title: "Wide Format Wordmark",
      description: "Horizontal layout for headers",
    },
    Apple: {
      title: "Apple-style Wordmark",
      description: "Clean style inspired by Apple design",
    },
  };

  const displayInfo = improvedNames[fileNameWithoutExt] || {
    title: fileNameWithoutExt,
    description: fileExt.replace(".", "").toUpperCase(),
  };

  const keywords = [
    fileName,
    fileNameWithoutExt,
    dirName,
    fileExt.replace(".", ""),
    displayInfo.title,
    displayInfo.description,
    "brand",
    "assets",
    "clo",
  ];

  return (
    <Grid.Item
      title={displayInfo.title}
      subtitle={displayInfo.description}
      keywords={keywords}
      content={props.file}
      actions={
        <ActionPanel>
          <Action
            title="Copy to Clipboard"
            icon={Icon.Clipboard}
            onAction={() => copyFileToClipboardWithFeedback(props.file)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Reveal in Finder"
            icon={Icon.Finder}
            onAction={() => {
              showHUD(`Opening ${basename(props.file)} in Finder`);
              Clipboard.copy({ file: props.file });
            }}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          {isImage && (
            <Action
              title="Open with Default App"
              icon={Icon.Eye}
              onAction={() => {
                showHUD(`Opening ${basename(props.file)}`);
                Clipboard.copy({ file: props.file });
              }}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

/**
 * Renders a single brand color as a Grid item
 */
function ColorItem(props: { color: Color }) {
  return (
    <Grid.Item
      title={props.color.name}
      subtitle={props.color.value}
      keywords={[props.color.name, props.color.value, "color", "palette", "brand color"]}
      content={{
        color: {
          light: props.color.value,
          dark: props.color.value,
          adjustContrast: false,
        },
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy Options">
            <Action
              title={`Copy Hex Value: ${props.color.value}`}
              icon={{ source: Icon.Clipboard, tintColor: props.color.value }}
              onAction={() => copyToClipboardWithFeedback(props.color.value, props.color.name)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Copy Css Variable"
              icon={Icon.Code}
              onAction={() =>
                copyToClipboardWithFeedback(
                  `--color-${props.color.name.toLowerCase().replace(/\s+/g, "-")}: ${props.color.value};`,
                  `CSS Variable: ${props.color.name}`
                )
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Copy Rgba Value"
              icon={Icon.Contrast}
              onAction={() => {
                const hex = props.color.value.replace("#", "");
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                copyToClipboardWithFeedback(`rgba(${r}, ${g}, ${b}, 1)`, `RGBA: ${props.color.name}`);
              }}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
