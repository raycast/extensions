import { readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, "../node_modules/@hugeicons/core-free-icons/dist/esm");
const OUTPUT_FILE = join(__dirname, "../assets/hugeicons-metadata.json");

type IconElement = [string, Record<string, string | number>];
type IconData = IconElement[];

interface IconMetadata {
  name: string;
  displayName: string;
  svg: string;
  reactComponent: string;
}

function buildSVG(iconData: IconData): string {
  const paths = iconData
    .map(([tag, attrs]) => {
      const attrString = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => {
          const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
          return `${kebabKey}="${value}"`;
        })
        .join(" ");
      return `<${tag} ${attrString} />`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    ${paths}
</svg>`;
}

function buildReactComponent(iconName: string, iconData: IconData): string {
  const componentName = iconName.replace(/Icon$/, "");

  const paths = iconData
    .map(([tag, attrs]) => {
      const attrString = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");
      return `    <${tag} ${attrString} />`;
    })
    .join("\n");

  return `const ${componentName} = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={24} height={24} color="#000000" fill="none" {...props}>
${paths}
  </svg>
);`;
}

function toDisplayName(iconName: string): string {
  return iconName
    .replace(/Icon$/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/(\d+)/g, " $1")
    .trim();
}

async function main(): Promise<void> {
  console.log("Reading icons from:", ICONS_DIR);

  const files = await readdir(ICONS_DIR);
  const jsFiles = files.filter((f) => f.endsWith(".js") && !f.endsWith(".map"));

  console.log(`Found ${jsFiles.length} JS files`);

  const metadata: Record<string, IconMetadata> = {};
  let successCount = 0;
  let skipCount = 0;

  for (const file of jsFiles) {
    const iconName = file.replace(".js", "");

    try {
      const modulePath = join(ICONS_DIR, file);
      const iconModule = await import(modulePath);
      const iconData = iconModule.default as IconData;

      // Skip if not a valid icon array
      if (!Array.isArray(iconData) || iconData.length === 0) {
        skipCount++;
        continue;
      }

      // Validate first element is a tuple [string, object]
      const [firstTag, firstAttrs] = iconData[0];
      if (typeof firstTag !== "string" || typeof firstAttrs !== "object") {
        skipCount++;
        continue;
      }

      const svg = buildSVG(iconData);
      const reactComponent = buildReactComponent(iconName, iconData);

      metadata[iconName] = {
        name: iconName,
        displayName: toDisplayName(iconName),
        svg,
        reactComponent,
      };

      successCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error processing ${iconName}:`, message);
    }
  }

  console.log(`\nProcessed: ${successCount} icons, ${skipCount} skipped`);

  await writeFile(OUTPUT_FILE, JSON.stringify(metadata, null, 2));
  console.log(`Written to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
