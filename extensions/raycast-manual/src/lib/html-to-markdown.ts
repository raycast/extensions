import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { tables, strikethrough } from "turndown-plugin-gfm";
import { extractAccordionAnswers, escapeHtml } from "./rsc";

const ARTICLE_SELECTORS = ["article", "main#main-content", "main", "[data-pagefind-body]"];

function buildTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  service.use([tables, strikethrough]);

  service.addRule("codeBlocks", {
    filter: ["pre"],
    replacement: (_content, node) => {
      const codeEl = (node as Element).querySelector("code");
      const language = codeEl?.className?.match(/language-(\w+)/)?.[1] ?? "";
      const raw = (node as Element).textContent ?? "";
      return `\n\`\`\`${language}\n${raw.replace(/\n+$/, "")}\n\`\`\`\n`;
    },
  });

  service.addRule("videos", {
    filter: "video",
    replacement: (_content, node) => {
      const el = node as Element;
      const direct = el.getAttribute("src");
      const sourceEl = el.querySelector("source[src]");
      const src = direct || sourceEl?.getAttribute("src") || "";
      if (!src) return "";
      let label = "Watch video";
      try {
        const u = new URL(src);
        const name = u.pathname.split("/").pop() ?? "";
        if (name) label = `Watch: ${name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")}`;
      } catch {
        /* keep default label */
      }
      return `\n\n[▶ ${label}](${src})\n\n`;
    },
  });

  service.addRule("iframes", {
    filter: "iframe",
    replacement: (_content, node) => {
      const el = node as Element;
      const src = el.getAttribute("src");
      if (!src) return "";
      const title = el.getAttribute("title") || "Embedded content";
      // Rewrite YouTube embeds back to their watch URL so the link is meaningful in a browser.
      const yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/);
      const target = yt ? `https://www.youtube.com/watch?v=${yt[1]}` : src;
      return `\n\n[▶ ${title}](${target})\n\n`;
    },
  });

  service.addRule("figcaptions", {
    filter: "figcaption",
    replacement: (content) => {
      const t = content.trim();
      return t ? `\n\n_${t}_\n\n` : "";
    },
  });

  return service;
}

const turndownService = buildTurndownService();

const BLOCK_SELECTOR = "p,div,h1,h2,h3,h4,h5,h6,ul,ol,li,blockquote,pre,table,figure,section,article";

function srcFromSrcSet(srcSet: string): string | null {
  // srcSet syntax: "url1 320w, url2 640w, ..." — pick the largest by width.
  const entries = srcSet
    .split(",")
    .map((s) => s.trim())
    .map((entry) => {
      const [url, size] = entry.split(/\s+/);
      const width = size && size.endsWith("w") ? parseInt(size, 10) : 0;
      return { url, width };
    })
    .filter((e) => e.url);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b.width - a.width);
  return entries[0].url;
}

function rewriteImages($: cheerio.CheerioAPI) {
  // Raycast's manual renders the same hero image three times (mac/windows/ios). Keep only mac.
  $("[data-platform-image]").each((_, el) => {
    const platform = $(el).attr("data-platform-image");
    if (platform && platform !== "mac") $(el).remove();
  });

  $("img").each((_, el) => {
    const $img = $(el);
    let src = $img.attr("src");
    if (!src) {
      const srcSet = $img.attr("srcset") ?? $img.attr("srcSet");
      if (srcSet) {
        const picked = srcFromSrcSet(srcSet);
        if (picked) {
          $img.attr("src", picked);
          src = picked;
        }
      }
    }
    // data: URIs (Next.js SVG placeholders) are useless to a markdown viewer.
    if (src?.startsWith("data:")) $img.removeAttr("src");
  });
}

function unwrapBlockAnchors($: cheerio.CheerioAPI) {
  // Anchors that wrap headings/paragraphs (e.g. Raycast's highlight cards) produce broken
  // markdown via Turndown. Flatten them: move the href onto the first heading (or insert
  // a "Read more" footer link) and unwrap the anchor so its block children become siblings.
  $("a").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href");
    if (!href) return;
    if ($a.children(BLOCK_SELECTOR).length === 0) return;

    // Strip non-content children (icons, svgs) before flattening.
    $a.find("svg").remove();

    const $heading = $a.find("h1, h2, h3, h4, h5, h6").first();
    if ($heading.length > 0) {
      const text = $heading.text().trim();
      $heading.empty().append($("<a>").attr("href", href).text(text));
    } else {
      $a.append($("<p>").append($("<a>").attr("href", href).text("Read more →")));
    }
    $a.replaceWith($a.contents());
  });
}

function resolveUrls($: cheerio.CheerioAPI, baseUrl: string) {
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) return;
    try {
      $(el).attr("href", new URL(href, baseUrl).href);
    } catch {
      /* ignore */
    }
  });
  $("img[src]").each((_, el) => {
    const $img = $(el);
    const src = $img.attr("src");
    if (!src || src.startsWith("data:")) return;
    try {
      const u = new URL(src, baseUrl);
      // Rewrite Next.js image proxy URLs back to the original asset for nicer display.
      if (u.pathname === "/_next/image") {
        const original = u.searchParams.get("url");
        if (original) {
          $img.attr("src", decodeURIComponent(original));
          return;
        }
      }
      $img.attr("src", u.href);
    } catch {
      /* ignore */
    }
  });
}

function reconstructAccordions($article: cheerio.Cheerio<never>, $: cheerio.CheerioAPI, html: string) {
  // Radix Accordion bodies are empty in the static HTML and only hydrate on the
  // client. Pull each body out of the RSC payload and splice it back in, using
  // the trigger button's `.triggerText` span as the section heading. Without
  // this, the entire FAQ / "What's new" sections on /notes, /billing, /games,
  // /troubleshooting, etc. render as blank under their heading.
  const answers = extractAccordionAnswers(html);
  $article.find('[class*="accordion-module"][class*="__item"]').each((_, el) => {
    const $item = $(el);
    const id = $item.attr("id");
    const question = $item.find('[class*="__triggerText"]').first().text().trim();
    const answer = id ? answers.get(id) : undefined;
    if (!question && !answer) return;
    const heading = question ? `<h3>${escapeHtml(question)}</h3>` : "";
    $item.replaceWith(heading + (answer ?? ""));
  });
  // Drop any leftover empty accordion root wrappers so they don't leave blank
  // paragraphs in the markdown output.
  $article.find('[class*="accordion-module"][class*="__root"]').each((_, el) => {
    const $root = $(el);
    if ($root.text().trim() === "" && $root.children().length === 0) $root.remove();
  });
}

export function htmlToMarkdown(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);

  let $article: cheerio.Cheerio<never> | null = null;
  for (const sel of ARTICLE_SELECTORS) {
    const $found = $(sel).first() as unknown as cheerio.Cheerio<never>;
    if ($found.length > 0) {
      $article = $found;
      break;
    }
  }
  if (!$article) return "";

  // Drop chrome we don't want in the rendered markdown.
  $article.find("nav, aside, header, footer, script, style, noscript").remove();
  $article.find("[aria-hidden='true']").remove();
  // Run before button removal so the trigger's `.triggerText` is still reachable.
  reconstructAccordions($article, $, html);
  $article.find("button").remove();
  $article.find("a.anchor, a.headerlink").remove();
  // The manual repeats the H1 inside the article — we render our own title above.
  $article.find("h1").first().remove();

  rewriteImages($);
  unwrapBlockAnchors($);
  resolveUrls($, baseUrl);

  return turndownService.turndown($.html($article)).trim();
}
