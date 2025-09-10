import type { Image } from "@raycast/api";
import type { Element } from "./elements-list";

export function svgToDataURL(svg: string): string {
	return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export function generateElementIconSvg(element: Element) {
	const symbol = element.symbol;
	const atomicNumber = element.number;

	const width = 128;
	const height = 128;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" rx="24" fill="#f5f5f5" />
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="64" font-family="sans-serif" font-weight="bold" fill="#222">${symbol}</text>
      <text x="16" y="32" font-size="24" font-family="sans-serif" fill="#555">${atomicNumber}</text>
    </svg>`;
}

export function getElementIcon(element: Element): Image.ImageLike {
	const svg = generateElementIconSvg(element);
	return { source: svgToDataURL(svg) };
}
