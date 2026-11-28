// A dynamic code's design (the `style` the REST API returns) as the props
// qrdx draws it with: the mapping the QRdx editor's preview uses
// (apps/app/lib/qr-design/props.ts editorCodeProps and engine-options.ts),
// which this extension can't import. apps/app/tests/plugins/raycast-code-style.test.ts
// holds this copy to the app's.

import type { QRCodeProps, QRProps } from "qrdx";
import { resolveQRCodeProps, resolveShadow } from "qrdx";
import type { QRRenderProps } from "./qr-engine";

/** The logo QRdx draws when a design shows one without its own. */
export const QRDX_LOGO = "https://qrdx.dev/logo.png";

/** The width dynamic codes are drawn and exported at, in pixels. */
export const DYNAMIC_CODE_SIZE = 1024;

/** The fields of a saved design this extension draws (others are ignored). */
export interface CodeStyle {
  bgColor?: QRProps["bgColor"];
  fgColor?: QRProps["fgColor"];
  eyeColor?: QRProps["eyeColor"];
  dotColor?: QRProps["dotColor"];
  bodyPattern?: QRProps["bodyPattern"];
  cornerEyePattern?: QRProps["cornerEyePattern"];
  cornerEyeDotPattern?: QRProps["cornerEyeDotPattern"];
  level?: QRProps["level"];
  margin?: number;
  frame?: QRProps["frame"];
  art?: QRProps["art"];
  showLogo?: boolean;
  customLogo?: string;
  logoOptions?: QRCodeProps["logoOptions"];
  eyeColors?: QRProps["eyeColors"];
  moduleScale?: number;
  autoLevel?: boolean;
  /** A named outline: `circle` or `heart` (square is the default) */
  shape?: string;
  /** An outline of the user's own; wins over `shape` */
  silhouette?: QRProps["shape"];
  eyeShapes?: QRProps["eyeShapes"];
  eyeGradient?: QRProps["eyeGradient"];
  bgRadius?: number;
  backdrop?: string;
  halo?: QRProps["halo"];
  shadow?: QRProps["shadow"];
}

/** The outline the code is drawn in, as engine-options.ts codeShape. */
function codeShape(style: CodeStyle): QRProps["shape"] | undefined {
  if (style.silhouette) return style.silhouette;
  return style.shape === "circle" || style.shape === "heart" ? style.shape : undefined;
}

/** Whether any eye of `eyes` sets an outer or inner value. */
function anyEye(eyes: Record<string, { outer?: unknown; inner?: unknown } | undefined> | undefined): boolean {
  return eyes !== undefined && Object.values(eyes).some((eye) => eye?.outer || eye?.inner);
}

/**
 * The engine options a design sets beyond colors, shapes and the frame, each
 * only when it draws something (engine-options.ts styleEngineOptions and
 * styleLooks; a short link never needs the Swiss QR-bill options).
 */
function engineOptions(style: CodeStyle): Partial<QRCodeProps> {
  const rounded = (style.bgRadius ?? 0) > 0;
  const shape = codeShape(style);
  return {
    ...(anyEye(style.eyeColors) && { eyeColors: style.eyeColors }),
    ...(style.moduleScale !== undefined && style.moduleScale < 1 && { moduleScale: style.moduleScale }),
    ...(style.autoLevel && { autoLevel: true }),
    ...(style.logoOptions && Object.keys(style.logoOptions).length > 0 && { logoOptions: style.logoOptions }),
    ...(shape && { shape }),
    ...(anyEye(style.eyeShapes) && { eyeShapes: style.eyeShapes }),
    ...(style.eyeGradient === "code" && { eyeGradient: "code" as const }),
    ...(rounded && { bgRadius: style.bgRadius }),
    ...(rounded && style.backdrop && { backdrop: style.backdrop }),
    ...(style.halo && { halo: style.halo }),
    ...(style.shadow && resolveShadow(style.shadow) && { shadow: style.shadow }),
  };
}

/** `<QRCode>`'s props for `value` in `style`, as the editor's preview draws it. */
export function codeProps(value: string, style: CodeStyle | null | undefined): QRCodeProps {
  const s = style ?? {};
  return {
    value,
    art: s.art,
    bgColor: s.bgColor,
    fgColor: s.fgColor,
    eyeColor: s.eyeColor,
    dotColor: s.dotColor,
    bodyPattern: s.bodyPattern,
    cornerEyePattern: s.cornerEyePattern,
    cornerEyeDotPattern: s.cornerEyeDotPattern,
    level: s.level,
    margin: s.margin,
    frame: s.frame,
    hideLogo: !s.showLogo,
    logo: s.customLogo ?? QRDX_LOGO,
    ...engineOptions(s),
  };
}

/**
 * What this extension draws and exports for a dynamic code: its short link
 * in its design, `size` pixels wide (plus any frame).
 */
export function dynamicCodeRenderProps(
  code: { shortLink: string; style: CodeStyle | null },
  size = DYNAMIC_CODE_SIZE
): QRRenderProps {
  const resolved = resolveQRCodeProps({ ...codeProps(code.shortLink, code.style), size });
  return { ...resolved, size: resolved.size ?? size };
}
