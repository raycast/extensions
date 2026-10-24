// Draws the post card with AppKit through JavaScript for Automation.
// Usage: osascript -l JavaScript render.js <spec.json>
// The spec holds the parsed thread, local image paths, theme and output path.
ObjC.import("Foundation");
ObjC.import("AppKit");

const WIDTH = 656;
const STAGE_PAD = 48;
const CARD_PAD = 24;
const CARD_W = 560;
const CONTENT_W = CARD_W - 2 * CARD_PAD;
const SCALE = 2;
const LINK_BLUE = [0.114, 0.608, 0.941];

const THEMES = {
  dark: { bg: "000000", fg: "e7e9ea", sec: "71767b", border: "2f3336", back: ["000000", "000000"], base: [12, 12, 20], mix: 0.55 },
  dim: { bg: "15202b", fg: "f7f9f9", sec: "8b98a5", border: "38444d", back: ["1a2330", "2a3a4d"], base: [12, 12, 20], mix: 0.55 },
  light: { bg: "ffffff", fg: "0f1419", sec: "536471", border: "eff3f4", back: ["e6e9ef", "f4f5f8"], base: [255, 255, 255], mix: 0.45 },
};

function rgbColor(r, g, b, a) {
  return $.NSColor.colorWithSRGBRedGreenBlueAlpha(r, g, b, a === undefined ? 1 : a);
}
function hexColor(hex, a) {
  return rgbColor(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255, a);
}

function run(argv) {
  const spec = JSON.parse(ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError($(argv[0]), $.NSUTF8StringEncoding, $())));
  const theme = THEMES[spec.theme] || THEMES.dark;
  const C = {
    bg: hexColor(theme.bg),
    fg: hexColor(theme.fg),
    sec: hexColor(theme.sec),
    border: hexColor(theme.border),
    link: rgbColor(LINK_BLUE[0], LINK_BLUE[1], LINK_BLUE[2]),
  };

  const images = {};
  function image(path) {
    if (!path) return null;
    if (!(path in images)) {
      const img = $.NSImage.alloc.initWithContentsOfFile($(path));
      images[path] = img.isNil() || img.size.width < 1 ? null : img;
    }
    return images[path];
  }

  let drawing = false;
  let H = 0;
  const yOf = (top, h) => H - top - h;
  const rect = (x, top, w, h) => $.NSMakeRect(x, yOf(top, h), w, h);

  function save() { $.NSGraphicsContext.saveGraphicsState; }
  function restore() { $.NSGraphicsContext.restoreGraphicsState; }

  function roundPath(x, top, w, h, r) {
    return $.NSBezierPath.bezierPathWithRoundedRectXRadiusYRadius(rect(x, top, w, h), r, r);
  }
  function fillRound(x, top, w, h, r, color) {
    if (!drawing) return;
    color.setFill;
    roundPath(x, top, w, h, r).fill;
  }
  function strokeRound(x, top, w, h, r, color) {
    if (!drawing) return;
    const p = roundPath(x + 0.5, top + 0.5, w - 1, h - 1, r);
    p.lineWidth = 1;
    color.setStroke;
    p.stroke;
  }
  function fillRect(x, top, w, h, color) {
    if (!drawing) return;
    color.setFill;
    $.NSBezierPath.fillRect(rect(x, top, w, h));
  }

  function drawCover(img, x, top, w, h) {
    const iw = img.size.width, ih = img.size.height;
    const k = Math.max(w / iw, h / ih);
    const sw = w / k, sh = h / k;
    img.drawInRectFromRectOperationFraction(rect(x, top, w, h), $.NSMakeRect((iw - sw) / 2, (ih - sh) / 2, sw, sh), $.NSCompositingOperationSourceOver, 1);
  }
  function placeholder(x, top, w, h) {
    fillRect(x, top, w, h, C.border);
  }

  function circleImage(path, x, top, d) {
    if (!drawing) return;
    save();
    $.NSBezierPath.bezierPathWithOvalInRect(rect(x, top, d, d)).addClip;
    const img = image(path);
    if (img) drawCover(img, x, top, d, d);
    else placeholder(x, top, d, d);
    restore();
  }

  function font(size, bold) {
    return bold ? $.NSFont.boldSystemFontOfSize(size) : $.NSFont.systemFontOfSize(size);
  }
  function attrs(size, bold, color, lineSpacing) {
    const d = $.NSMutableDictionary.dictionary;
    d.setObjectForKey(font(size, bold), $.NSFontAttributeName);
    d.setObjectForKey(color, $.NSForegroundColorAttributeName);
    if (lineSpacing) {
      const ps = $.NSMutableParagraphStyle.new;
      ps.lineSpacing = lineSpacing;
      d.setObjectForKey(ps, $.NSParagraphStyleAttributeName);
    }
    return d;
  }
  function lineWidth(str, size, bold) {
    return $(str).sizeWithAttributes(attrs(size, bold, C.fg)).width;
  }
  const lineHeight = (size) => Math.ceil(size * 1.22);
  function line(x, top, str, size, bold, color) {
    const w = lineWidth(str, size, bold);
    if (drawing) $(str).drawAtPointWithAttributes($.NSMakePoint(x, yOf(top, lineHeight(size))), attrs(size, bold, color));
    return w;
  }

  function richText(runs, x, top, w, size) {
    const m = $.NSMutableAttributedString.new;
    const ranges = [];
    runs.forEach((r) => {
      const loc = m.length;
      m.replaceCharactersInRangeWithString($.NSMakeRange(loc, 0), $(r.text));
      ranges.push([loc, r.text.length, r.link]);
    });
    const all = $.NSMakeRange(0, m.length);
    const base = attrs(size, false, C.fg, size * 0.17);
    m.addAttributeValueRange($.NSFontAttributeName, font(size, false), all);
    m.addAttributeValueRange($.NSForegroundColorAttributeName, C.fg, all);
    m.addAttributeValueRange($.NSParagraphStyleAttributeName, base.objectForKey($.NSParagraphStyleAttributeName), all);
    ranges.forEach((r) => {
      if (r[2] && r[1] > 0) m.addAttributeValueRange($.NSForegroundColorAttributeName, C.link, $.NSMakeRange(r[0], r[1]));
    });
    // boundingRect under-measures long wrapped text by a line; the layout manager is exact.
    const store = $.NSTextStorage.new;
    store.setAttributedString(m);
    const manager = $.NSLayoutManager.new;
    const container = $.NSTextContainer.alloc.initWithSize($.NSMakeSize(w, 1e7));
    container.lineFragmentPadding = 0;
    manager.addTextContainer(container);
    store.addLayoutManager(manager);
    manager.ensureLayoutForTextContainer(container);
    const h = Math.ceil(manager.usedRectForTextContainer(container).size.height);
    // AppKit drops a final line that does not fit exactly, so draw into a taller rect.
    if (drawing) m.drawWithRectOptions(rect(x, top, w, h + size * 2), $.NSStringDrawingUsesLineFragmentOrigin);
    return h;
  }

  function badge(x, top, d) {
    if (!drawing) return;
    $.NSColor.colorWithSRGBRedGreenBlueAlpha(0.114, 0.608, 0.941, 1).setFill;
    $.NSBezierPath.bezierPathWithOvalInRect(rect(x, top, d, d)).fill;
    const p = $.NSBezierPath.bezierPath;
    const px = (fx) => x + d * fx, py = (fy) => yOf(top, d) + d * (1 - fy);
    p.moveToPoint($.NSMakePoint(px(0.29), py(0.52)));
    p.lineToPoint($.NSMakePoint(px(0.43), py(0.66)));
    p.lineToPoint($.NSMakePoint(px(0.71), py(0.37)));
    p.lineWidth = d * 0.1;
    p.lineCapStyle = $.NSLineCapStyleRound;
    p.lineJoinStyle = $.NSLineJoinStyleRound;
    $.NSColor.whiteColor.setStroke;
    p.stroke;
  }

  function fit(str, size, bold, maxW) {
    if (maxW <= 0) return "";
    if (lineWidth(str, size, bold) <= maxW) return str;
    let n = str.length;
    while (n > 0 && lineWidth(str.slice(0, n) + "…", size, bold) > maxW) n--;
    return n > 0 ? str.slice(0, n) + "…" : "";
  }

  // Draws name, badge, handle and time on one baseline row within width; returns its height.
  function headerRow(post, x, top, size, withWhen, width) {
    const badgeW = post.verified ? size + 7 : 0;
    const handle = "@" + post.handle;
    const handleW = lineWidth(handle, size - 1, false);
    const name = fit(post.name, size, true, width - badgeW - 4 - Math.min(handleW, width * 0.4) - 6);
    let cx = x;
    cx += line(cx, top, name, size, true, C.fg) + 4;
    if (post.verified) {
      const d = size + 1;
      badge(cx, top + (lineHeight(size) - d) / 2, d);
      cx += d + 6;
    }
    const handleFit = fit(handle, size - 1, false, x + width - cx);
    cx += line(cx, top, handleFit, size - 1, false, C.sec) + 6;
    if (withWhen && post.when) {
      const when = "· " + post.when;
      if (cx + lineWidth(when, size - 1, false) <= x + width) line(cx, top, when, size - 1, false, C.sec);
    }
    return lineHeight(size);
  }

  function mediaBlock(items, x, top, w, radius) {
    if (!items.length) return 0;
    const n = Math.min(items.length, 4);
    const gap = 2;
    const cells = [];
    let h;
    if (n === 1) {
      const img = image(items[0].path);
      h = img ? Math.min(Math.round((w * img.size.height) / img.size.width), 520) : 260;
      cells.push([0, 0, w, h]);
    } else {
      const cw = (w - gap) / 2;
      const ch = 240;
      if (n === 3) {
        h = ch * 2 + gap;
        cells.push([0, 0, cw, h], [cw + gap, 0, cw, ch], [cw + gap, ch + gap, cw, ch]);
      } else {
        h = n === 2 ? ch : ch * 2 + gap;
        cells.push([0, 0, cw, ch], [cw + gap, 0, cw, ch]);
        if (n === 4) cells.push([0, ch + gap, cw, ch], [cw + gap, ch + gap, cw, ch]);
      }
    }
    if (drawing) {
      save();
      roundPath(x, top, w, h, radius).addClip;
      fillRect(x, top, w, h, C.border);
      cells.forEach((c, i) => {
        const img = image(items[i].path);
        save();
        $.NSBezierPath.bezierPathWithRect(rect(x + c[0], top + c[1], c[2], c[3])).addClip;
        if (img) drawCover(img, x + c[0], top + c[1], c[2], c[3]);
        restore();
        if (items[i].video) {
          const d = 64, cx = x + c[0] + c[2] / 2 - d / 2, cy = top + c[1] + c[3] / 2 - d / 2;
          rgbColor(0, 0, 0, 0.6).setFill;
          $.NSBezierPath.bezierPathWithOvalInRect(rect(cx, cy, d, d)).fill;
          const ring = $.NSBezierPath.bezierPathWithOvalInRect(rect(cx + 1.5, cy + 1.5, d - 3, d - 3));
          ring.lineWidth = 3;
          $.NSColor.whiteColor.setStroke;
          ring.stroke;
          const t = $.NSBezierPath.bezierPath;
          t.moveToPoint($.NSMakePoint(cx + 25, yOf(cy + 18, 0)));
          t.lineToPoint($.NSMakePoint(cx + 25, yOf(cy + 46, 0)));
          t.lineToPoint($.NSMakePoint(cx + 45, yOf(cy + 32, 0)));
          t.closePath;
          $.NSColor.whiteColor.setFill;
          t.fill;
        }
      });
      restore();
      strokeRound(x, top, w, h, radius, C.border);
    }
    return h;
  }

  function quoteBlock(q, x, top, w) {
    const padX = 14, padY = 12;
    const ix = x + padX, iw = w - 2 * padX;
    let y = top + padY;
    circleImage(q.avatarPath, ix, y, 22);
    const rowH = Math.max(22, headerRow(q, ix + 28, y + 1, 15, true, iw - 28));
    y += rowH;
    if (q.runs.length) y += 6 + richText(q.runs, ix, y + 6, iw, 17);
    if (q.media.length) y += 10 + mediaBlock(q.media, ix, y + 10, iw, 12);
    const total = y + padY - top;
    strokeRound(x, top, w, total, 16, C.border);
    return total;
  }

  function postBody(post, x, top, w, size) {
    let y = top;
    if (post.runs.length) y += richText(post.runs, x, y, w, size);
    if (post.media.length) y += (y > top ? 12 : 0) + mediaBlock(post.media, x, y + (y > top ? 12 : 0), w, 16);
    if (post.quote) y += (y > top ? 14 : 0) + quoteBlock(post.quote, x, y + (y > top ? 14 : 0), w);
    return y - top;
  }

  function parentRow(p, x, top) {
    const bx = x + 60, bw = CONTENT_W - 60;
    circleImage(p.avatarPath, x, top, 48);
    let h = headerRow(p, bx, top, 16, true, bw);
    const body = postBody(p, bx, top + h + 4, bw, 18);
    h = Math.max(h + 4 + body, 48) + 20;
    if (drawing) fillRect(x + 23, top + 52, 2, h - 52, C.border);
    return h;
  }

  function focalBlock(p, x, top) {
    circleImage(p.avatarPath, x, top, 48);
    const hw = CONTENT_W - 60;
    let nx = x + 60;
    nx += line(nx, top + 4, fit(p.name, 17, true, hw - (p.verified ? 22 : 0)), 17, true, C.fg) + 4;
    if (p.verified) badge(nx, top + 4 + (lineHeight(17) - 18) / 2, 18);
    line(x + 60, top + 4 + lineHeight(17), fit("@" + p.handle, 15, false, hw), 15, false, C.sec);
    let y = top + 48 + 16;
    y += postBody(p, x, y, CONTENT_W, 23);

    const parts = [];
    if (p.when) parts.push([p.when, false]);
    if (p.when && p.views) parts.push([" · ", false]);
    if (p.views) parts.push([p.views, true], [" Views", false]);
    if (parts.length) {
      y += 16;
      let cx = x;
      parts.forEach((part) => { cx += line(cx, y, part[0], 15, part[1], part[1] ? C.fg : C.sec); });
      y += lineHeight(15);
    }
    if (p.stats.length) {
      y += 14;
      fillRect(x, y, CONTENT_W, 1, C.border);
      y += 14;
      let cx = x;
      p.stats.forEach((s) => {
        const w = lineWidth(s.count, 15, true) + lineWidth(" " + s.label, 15, false);
        if (cx > x && cx + w > x + CONTENT_W) { cx = x; y += lineHeight(15) + 6; }
        cx += line(cx, y, s.count, 15, true, C.fg);
        cx += line(cx, y, " " + s.label, 15, false, C.sec) + 20;
      });
      y += lineHeight(15);
    }
    return y - top;
  }

  function layout() {
    const x = STAGE_PAD + CARD_PAD;
    let y = STAGE_PAD + CARD_PAD;
    spec.thread.parents.forEach((p) => { y += parentRow(p, x, y); });
    y += focalBlock(spec.thread.focal, x, y);
    return y + CARD_PAD + STAGE_PAD;
  }

  function samplePalette() {
    const pixels = [];
    const paths = [];
    (function collect(p) {
      if (p.avatarPath) paths.push(p.avatarPath);
      p.media.forEach((m) => { if (m.path) paths.push(m.path); });
      if (p.quote) collect(p.quote);
    })(spec.thread.focal);
    spec.thread.parents.forEach((p) => { if (p.avatarPath) paths.push(p.avatarPath); });
    const N = 16;
    paths.forEach((path) => {
      const img = image(path);
      if (!img) return;
      const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(null, N, N, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
      save();
      $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));
      const k = Math.max(N / img.size.width, N / img.size.height);
      const sw = N / k, sh = N / k;
      img.drawInRectFromRectOperationFraction($.NSMakeRect(0, 0, N, N), $.NSMakeRect((img.size.width - sw) / 2, (img.size.height - sh) / 2, sw, sh), $.NSCompositingOperationSourceOver, 1);
      restore();
      for (let py = 0; py < N; py++) {
        for (let px = 0; px < N; px++) {
          const c = rep.colorAtXY(px, py);
          if (c.alphaComponent >= 0.8) pixels.push([c.redComponent, c.greenComponent, c.blueComponent]);
        }
      }
    });
    {
      const [minV, minS] = [0.3, 0.25];
      const buckets = [];
      for (let k = 0; k < 12; k++) buckets.push({ w: 0, r: 0, g: 0, b: 0 });
      pixels.forEach(([r, g, b]) => {
        const mx = Math.max(r, g, b), dl = mx - Math.min(r, g, b);
        const sat = mx ? dl / mx : 0;
        if (mx < minV || sat < minS) return;
        const h = mx === r ? ((g - b) / dl + 6) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
        const bk = buckets[Math.floor(h * 2) % 12];
        const w = sat * mx;
        bk.w += w; bk.r += r * w; bk.g += g * w; bk.b += b * w;
      });
      const top = buckets
        .filter((b) => b.w > 0)
        .sort((a, b) => b.w - a.w)
        .slice(0, 3)
        .map((b) => [(b.r / b.w) * 255, (b.g / b.w) * 255, (b.b / b.w) * 255]);
      if (top.length) return { colors: top, vivid: true };
    }
    if (!pixels.length) return { colors: [], vivid: false };
    const mean = [0, 1, 2].map((n) => (pixels.reduce((a, p) => a + p[n], 0) / pixels.length) * 255);
    return { colors: [mean], vivid: false };
  }

  function backdropColors() {
    const { colors, vivid } = samplePalette();
    if (!colors.length) return theme.back.map((h) => hexColor(h));
    if (!vivid) {
      const c = rgbColor.apply(null, colors[0].map((v) => v / 255));
      return [c, c];
    }
    const t = theme.mix;
    const mixed = colors.map((c) => rgbColor.apply(null, c.map((v, n) => (v * t + theme.base[n] * (1 - t)) / 255)));
    if (mixed.length === 1) mixed.push(mixed[0]);
    return mixed;
  }

  H = layout();
  const backdrop = backdropColors();

  const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(null, WIDTH * SCALE, H * SCALE, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
  rep.size = $.NSMakeSize(WIDTH, H);
  save();
  $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));
  $.NSGraphicsContext.currentContext.imageInterpolation = $.NSImageInterpolationHigh;
  drawing = true;

  $.NSGradient.alloc.initWithColors($(backdrop)).drawInRectAngle($.NSMakeRect(0, 0, WIDTH, H), -45);

  const cardTop = STAGE_PAD, cardH = H - 2 * STAGE_PAD;
  save();
  const shadow = $.NSShadow.new;
  shadow.shadowOffset = $.NSMakeSize(0, -20);
  shadow.shadowBlurRadius = 60;
  shadow.shadowColor = rgbColor(0, 0, 0, 0.28);
  shadow.set;
  fillRound(STAGE_PAD, cardTop, CARD_W, cardH, 20, C.bg);
  restore();
  fillRound(STAGE_PAD, cardTop, CARD_W, cardH, 20, C.bg);
  strokeRound(STAGE_PAD, cardTop, CARD_W, cardH, 20, C.border);

  layout();
  restore();

  const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
  if (!png.writeToFileAtomically($(spec.out), true)) throw new Error("could not write " + spec.out);
  return "ok";
}
