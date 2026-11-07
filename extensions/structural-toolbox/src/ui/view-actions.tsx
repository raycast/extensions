import { useState } from "react";
import { Action, ActionPanel, Detail, List, Icon, environment, useNavigation, Keyboard } from "@raycast/api";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { pngFromSVG } from "./raster";
import { palette } from "./visual-style";
import { enlargedDiagram } from "./drawings";
const viewerCache = new Map<string, string>();
const htmlEscape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/** A local, standalone image window with real zoom. No server, remote scripts, or data uploads. */
export function saveDiagramViewer(markdown: string, title = "Structural diagram") {
  const selected = diagramFromMarkdown(markdown);
  if (!selected) throw Error("No diagram is available yet");
  const all = [...markdown.matchAll(/!\[([^\]]*)\]\((data:image\/png;base64,[^)]+)\)/g)];
  const diagrams = all.filter((m) => !/^equation\b/i.test(m[1]));
  const items = diagrams.length ? diagrams : all;
  const key = createHash("sha256")
    .update(title + palette().bg + JSON.stringify(items.map((m) => [m[1], m[2]])))
    .digest("hex")
    .slice(0, 24);
  const cached = viewerCache.get(key);
  if (cached && existsSync(cached)) return cached;
  const directory = join(environment.supportPath, "diagram-previews");
  mkdirSync(directory, { recursive: true });
  const file = join(directory, key + ".html");
  const initial = Math.max(
    0,
    items.findIndex((m) => m[2] === selected),
  );
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><title>${htmlEscape(title)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:${palette().bg};color:${palette().ink};font:16px system-ui,sans-serif}header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 18px;border-bottom:1px solid ${palette().border};position:sticky;top:0;background:${palette().bg};z-index:1}button,select{font:inherit;padding:8px 12px;border:1px solid ${palette().border};border-radius:9px;background:${palette().soft};color:inherit;cursor:pointer}select{max-width:340px}#viewport{height:calc(100vh - 115px);overflow:auto;padding:20px;cursor:grab}#viewport.dragging{cursor:grabbing}img{display:block;max-width:none;margin:auto;user-select:none}footer{padding:10px 18px;color:${palette().sub};font-size:14px}button:focus-visible,select:focus-visible{outline:3px solid ${palette().blue}}</style>
  <header><strong>${htmlEscape(title)}</strong><select id="diagram" aria-label="Choose diagram">${items.map((m, i) => `<option value="${i}" ${i === initial ? "selected" : ""}>${htmlEscape(m[1] || "Diagram " + (i + 1))}</option>`).join("")}</select><button id="minus" aria-label="Zoom out">−</button><output id="level"></output><button id="plus" aria-label="Zoom in">+</button><button id="fit">Fit width</button><button id="actual">100%</button><button id="full">Full screen</button></header>
  <div id="viewport"><img id="image" draggable="false" alt="Structural calculation diagram"></div><footer>Scroll to move vertically. Ctrl + wheel to zoom. Drag to pan. + / − to zoom; 0 to fit width. Use the diagram menu for other plots.</footer>
  <script>const images=${JSON.stringify(items.map((m) => m[2]))};const vp=document.getElementById('viewport'),im=document.getElementById('image'),level=document.getElementById('level');let scale=1,drag;
  function zoom(n){scale=Math.max(.1,Math.min(8,n));im.style.width=Math.round(im.naturalWidth*scale)+'px';level.textContent=Math.round(scale*100)+'%'}function fit(){zoom((vp.clientWidth-40)/im.naturalWidth)}im.onload=fit;const requested=(typeof location==='undefined'?'':location.hash).match(/^#diagram=(\\d+)$/),start=requested&&Number(requested[1])<images.length?Number(requested[1]):${initial};document.getElementById('diagram').value=String(start);im.src=images[start];
  document.getElementById('diagram').onchange=e=>{im.src=images[Number(e.target.value)];vp.scrollTo(0,0)};document.getElementById('plus').onclick=()=>zoom(scale*1.25);document.getElementById('minus').onclick=()=>zoom(scale/1.25);document.getElementById('actual').onclick=()=>zoom(1);document.getElementById('fit').onclick=fit;document.getElementById('full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();vp.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();zoom(scale*(e.deltaY<0?1.15:1/1.15))}},{passive:false});vp.onpointerdown=e=>{if(e.button!==0)return;drag=[e.clientX,e.clientY,vp.scrollLeft,vp.scrollTop];vp.classList.add('dragging');vp.setPointerCapture(e.pointerId)};vp.onpointermove=e=>{if(drag){vp.scrollLeft=drag[2]+drag[0]-e.clientX;vp.scrollTop=drag[3]+drag[1]-e.clientY}};vp.onpointerup=vp.onpointercancel=()=>{drag=undefined;vp.classList.remove('dragging')};document.onkeydown=e=>{if(e.target.tagName==='SELECT')return;if(e.key==='+'||e.key==='='){e.preventDefault();zoom(scale*1.25)}if(e.key==='-'){e.preventDefault();zoom(scale/1.25)}if(e.key==='0'){e.preventDefault();fit()}};</script></html>`;
  writeFileSync(file, html, "utf8");
  viewerCache.set(key, file);
  if (viewerCache.size > 64) viewerCache.delete(viewerCache.keys().next().value!);
  return file;
}
/** Native Raycast must receive a bare image. Wrapping it in a markdown link breaks Windows fit-to-pane sizing. */
export function previewMarkdown(markdown: string, _title = "Structural diagram") {
  return markdown.replace(/\[(!\[[^\]]*\]\(data:image\/png;base64,[^)]+\))\]\(file:[^)]+\)/g, "$1");
}
/** Raycast fits a bare image to the pane width, so a tall image runs off-screen. Pad it to the pane's shape so it scales to fit whole. */
const PANE_ASPECT = 2.05;
export function fitToPane(image: string, aspect = PANE_ASPECT) {
  const bytes = Buffer.from(image.split(",")[1], "base64");
  if (bytes.readUInt32BE(0) !== 0x89504e47) return image;
  const w = bytes.readUInt32BE(16),
    h = bytes.readUInt32BE(20);
  if (w / h >= aspect) return image;
  const width = Math.round(h * aspect),
    x = Math.round((width - w) / 2);
  const png = pngFromSVG(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}"><rect width="${width}" height="${h}" fill="${palette().bg}"/><image href="${image}" x="${x}" width="${w}" height="${h}"/></svg>`,
    width,
  );
  return "data:image/png;base64," + png.toString("base64");
}
export function saveDiagramImage(image: string) {
  const bytes = Buffer.from(image.split(",")[1], "base64");
  if (bytes.readUInt32BE(0) !== 0x89504e47) throw Error("Diagram is not a PNG");
  const w = bytes.readUInt32BE(16),
    h = bytes.readUInt32BE(20);
  const flattened = pngFromSVG(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${palette().bg}"/><image href="${image}" width="${w}" height="${h}"/></svg>`,
    w,
  );
  const directory = join(environment.supportPath, "diagram-previews");
  mkdirSync(directory, { recursive: true });
  const file = join(directory, createHash("sha256").update(flattened).digest("hex").slice(0, 24) + ".png");
  writeFileSync(file, flattened);
  return file;
}
/** The native Detail API exposes no wheel/pinch handlers. Expand without shrinking content. */
export function diagramFromMarkdown(markdown: string) {
  const images = [...markdown.matchAll(/!\[([^\]]*)\]\((data:image\/png;base64,[^)]+)\)/g)];
  return (images.find((m) => /section|diagram|overview|summary|arrangement/i.test(m[1])) || images[0])?.[2];
}
export function ViewActions({
  markdown,
  title = "Calculation",
  expanded = false,
}: {
  markdown: string;
  title?: string;
  expanded?: boolean;
}) {
  const { push } = useNavigation();
  const image = diagramFromMarkdown(markdown);
  return (
    <ActionPanel.Section title="View">
      {image && (
        <Action
          title="Enlarge Diagram"
          icon={Icon.ArrowsExpand}
          shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
          onAction={() => push(<DiagramPreview markdown={markdown} title={title} />)}
        />
      )}
      {!expanded && (
        <Action
          title="Open Full View"
          icon={Icon.ArrowsExpand}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={() =>
            push(
              <Detail
                navigationTitle={title}
                markdown={previewMarkdown(markdown)}
                actions={
                  <ActionPanel>
                    <ViewActions markdown={markdown} title={title} expanded />
                    <Action.CopyToClipboard title="Copy Calculation" content={markdown} />
                  </ActionPanel>
                }
              />,
            )
          }
        />
      )}
    </ActionPanel.Section>
  );
}

/** A real in-app enlargement: full-width, one bare image, independent of OS file associations. */
export function DiagramPreview({ markdown, title = "Diagram" }: { markdown: string; title?: string }) {
  const candidates = [...previewMarkdown(markdown).matchAll(/!\[([^\]]*)\]\((data:image\/png;base64,[^)]+)\)/g)];
  const diagrams = candidates.filter((m) => !/^equation\b/i.test(m[1]));
  const images = diagrams.length ? diagrams : candidates;
  const preferred = diagramFromMarkdown(markdown);
  const [index, setIndex] = useState(
    Math.max(
      0,
      images.findIndex((m) => m[2] === preferred),
    ),
  );
  const current = images[index] || images[0];
  if (!current) return <Detail markdown="No diagram is available for this result yet." />;
  const shown = enlargedDiagram(current[2]) ?? current[2];
  const file = saveDiagramImage(shown);
  const viewer = saveDiagramViewer(markdown, title);
  const browserURL = pathToFileURL(viewer).href + "#diagram=" + index;
  return (
    <Detail
      navigationTitle={title + " — Diagram " + (index + 1) + " / " + images.length}
      markdown={`![${current[1]}](${fitToPane(shown)})`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Zoom Viewer in Browser"
            url={browserURL}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.Open title="Open Diagram Image" target={file} />
          {images.length > 1 && (
            <>
              <Action
                title="Next Diagram"
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => setIndex((index + 1) % images.length)}
              />
              <Action
                title="Previous Diagram"
                shortcut={{ modifiers: ["ctrl"], key: "p" }}
                onAction={() => setIndex((index + images.length - 1) % images.length)}
              />
            </>
          )}
          <Action.CopyToClipboard title="Copy Image Path" content={file} />
          <Action.CopyToClipboard title="Copy Zoom Viewer URL" content={browserURL} />
        </ActionPanel>
      }
    />
  );
}
/** Visible result row: Enter opens the image instead of burying enlargement in the action menu. */
export function EnlargeDiagramRow({ markdown, title = "Calculation" }: { markdown: string; title?: string }) {
  const { push } = useNavigation();
  if (!diagramFromMarkdown(markdown)) return null;
  return (
    <List.Item
      id="enlarge-diagram"
      title="Enlarge diagram"
      icon={Icon.ArrowsExpand}
      detail={<List.Item.Detail markdown={previewMarkdown(markdown)} />}
      actions={
        <ActionPanel>
          <Action
            title="Enlarge Diagram"
            onAction={() => push(<DiagramPreview markdown={markdown} title={title} />)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
          />
        </ActionPanel>
      }
    />
  );
}
