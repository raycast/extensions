# GoSaveTool Text and Image Tools

Text and image tools from [GoSaveTool](https://www.gosavetool.com/), free online tools for creators, right in Raycast. Everything runs on your computer and nothing is uploaded.

## Commands

| Command | What it does |
| --- | --- |
| Count Words and Characters | Words, characters, sentences, paragraphs, reading and speaking time |
| Check Social Media Limits | X post, Instagram and TikTok captions, YouTube title and description, LinkedIn, Pinterest, SEO title and meta description |
| Change Case | UPPER, lower, Title Case, Sentence case, camelCase, PascalCase, snake_case, CONSTANT_CASE, kebab-case, URL slug, clean extra spaces |
| Make URL Slug | Copies a clean slug: `Ölçü Birimi & Çeviri!` → `olcu-birimi-ceviri` |
| Compress Image | Makes PNG, JPG and WebP files smaller, with an optional max width |
| Convert Image Format | Converts between PNG, JPG and WebP |
| Search Online Tools | Opens the [online tools](https://www.gosavetool.com/) for subtitles, images and text |

The text commands use the text you type as the argument, else the selected text, else the clipboard.

The image commands start with the images selected in Finder or File Explorer. New files are saved next to the originals with `-gosavetool` in the name, so the originals are never changed.

## How it works

The text helpers are the same code as the [`@gosavetool/text`](https://www.npmjs.com/package/@gosavetool/text) package and the [Character Counter](https://www.gosavetool.com/character-counter). Reading time uses 238 words a minute.

Images are processed with the open source Squoosh codecs compiled to WebAssembly: libwebp for WebP, MozJPEG for JPG and OxiPNG for PNG, from the [jSquash](https://github.com/jamsinclair/jSquash) packages (`assets/wasm` holds their `.wasm` files). There are no native modules, so the extension works the same on macOS and Windows.

For more formats, animated images or social media sizes, use the [Image Compressor](https://www.gosavetool.com/image-compressor), [WebP Converter](https://www.gosavetool.com/webp-converter) and [Resize Image for Social Media](https://www.gosavetool.com/resize-image-for-social-media) online.

## Feedback

Write to us on the [contact page](https://www.gosavetool.com/contact) or open an issue in [mitolocya/gosavetool](https://github.com/mitolocya/gosavetool).
