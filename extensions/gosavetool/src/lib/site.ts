// Links to the online tools on gosavetool.com

export const SITE = "https://www.gosavetool.com/";

export const TOOLS = [
  {
    slug: "character-counter",
    title: "Character Counter",
    group: "Text",
    desc: "Words, characters, reading time and social media limits",
  },
  {
    slug: "cool-text-generator",
    title: "Cool Text Generator",
    group: "Text",
    desc: "Fancy Unicode fonts to copy and paste",
  },
  {
    slug: "image-compressor",
    title: "Image Compressor",
    group: "Images",
    desc: "Make JPG, PNG and WebP files smaller",
  },
  { slug: "webp-converter", title: "WebP Converter", group: "Images", desc: "Convert images to and from WebP" },
  { slug: "convert-image-format", title: "Convert Image Format", group: "Images", desc: "PNG, JPG, WebP and more" },
  {
    slug: "resize-image-for-social-media",
    title: "Resize Image for Social Media",
    group: "Images",
    desc: "Sizes for Instagram, YouTube, X and more",
  },
  {
    slug: "vtt-subtitle-generator",
    title: "VTT Subtitle Generator",
    group: "Subtitles",
    desc: "Write and time WebVTT subtitles",
  },
  {
    slug: "auto-captions-generator",
    title: "Auto Captions Generator",
    group: "Subtitles",
    desc: "Captions from the speech in a video",
  },
  { slug: "video-to-text", title: "Video to Text", group: "Subtitles", desc: "Transcribe a video to text" },
] as const;

export const toolUrl = (slug: string) => SITE + slug;
