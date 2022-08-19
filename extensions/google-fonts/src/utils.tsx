import { Font } from "./types";

interface IDictionary {
  [index: string]: string;
}

// https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight
const fontVariantMap = {
  100: "Thin (100)",
  200: "ExtraLight (200)",
  300: "Light (300)",
  400: "Regular (400)",
  regular: "Regular (400)",
  500: "Medium (500)",
  600: "SemiBold (600)",
  700: "Bold (700)",
  800: "ExtraBold (800)",
  900: "Black (900)",
  950: "ExtraBlack (950)",

  // italics
  "100italic": "Thin (100/Italic)",
  "200italic": "ExtraLight (200/Italic)",
  "300italic": "Light (300/Italic)",
  "400italic": "Normal (400/Italic)",
  italic: "Regular (400/Italic)",
  regularitalic: "Regular (400/Italic)",
  "500italic": "Medium (500/Italic)",
  "600italic": "SemiBold (600/Italic)",
  "700italic": "Bold (700/Italic)",
  "800italic": "ExtraBold (800/Italic)",
  "900italic": "Black (900/Italic)",
  "950italic": "ExtraBlack (950/Italic)",
} as IDictionary;

const friendlyFontVariant = (variant: string): string => {
  return fontVariantMap[variant] || "Bad Variant";
};

const cleanFontVariants = (variants: string[]) => {
  return variants
    .filter((variant) => variant !== "italic")
    .map((variant: string) => {
      let parseableVariant = variant;

      if (variant.toLowerCase() == "regular") {
        parseableVariant = "400";
      } else {
        parseableVariant = variant.replace(/[a-zA-Z]+/, "");
      }

      return parseInt(parseableVariant);
    })
    .reduce((pvs: number[], variant: number) => {
      if (!pvs.includes(variant)) pvs.push(variant);
      return pvs;
    }, [])
    .sort((a, b) => a - b);
};

const filterFontMatchFamily = (haystack: Font, needle: string) => {
  return haystack.family.toLowerCase().includes(needle.toLowerCase());
};

const filterFontSearch = (searchText: string, selectedCategory: string) => {
  return (font: Font) => {
    return filterFontMatchFamily(font, searchText) && (selectedCategory ? font.category === selectedCategory : true);
  };
};

const generateHTMLContent = (selectedFont: Font, selectedVariants: string[], mode: string) => {
  let htmlContent = "";

  const family = selectedFont.family.replace(" ", "+");
  const includesItalic = selectedVariants.some((variant) => variant.includes("italic"));
  const variants = cleanFontVariants(selectedVariants);

  const weightString = variants
    .map(
      (variant, variantIndex) =>
        `${selectedVariants[variantIndex].includes("italic") ? 1 : includesItalic ? 0 : ""}${
          includesItalic ? "," : ""
        }${variant}`
    )
    .join(";");

  switch (mode) {
    case "import":
      htmlContent = `<style>
@import url('https://fonts.googleapis.com/css2?family=${family}${
        selectedVariants.length ? `${includesItalic ? ":ital," : ":"}wght@${weightString}` : ""
      }&display=swap');
</style>`;
      break;
    case "link":
      htmlContent = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${family}${
        selectedVariants.length ? `${includesItalic ? ":ital," : ":"}wght@${weightString}` : ""
      }&display=swap" rel="stylesheet">`;
      break;
  }

  return htmlContent;
};

const generateFontPreviewUrl = (font: Font) => {
  return `google-fonts/${font.family.replace(new RegExp(/\s/, "g"), "")}.png`;
};

const reducerFontCategory = (categories: string[], font: Font) => {
  if (!categories.includes(font.category)) {
    categories.push(font.category);
  }

  return categories;
};

const generateGoogleFontsURL = (font: Font, type: string) => {
  const webSafeFontFamily = font.family.split(" ").join("+");

  let googleFontsUrl = "https://fonts.google.com";

  if (type === "view") {
    googleFontsUrl += `/specimen/${webSafeFontFamily}`;
  } else if (type === "download") {
    googleFontsUrl += `/download?family=${webSafeFontFamily}`;
  }

  return googleFontsUrl;
};

export {
  friendlyFontVariant,
  filterFontSearch,
  generateFontPreviewUrl,
  generateHTMLContent,
  reducerFontCategory,
  generateGoogleFontsURL,
};
