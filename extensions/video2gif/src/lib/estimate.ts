/**
 * Estimate the output GIF file size based on conversion settings.
 *
 * This is a rough heuristic — GIF compression varies wildly based on
 * content complexity (motion, colors, gradients). Use as a ballpark.
 */
export function estimateGifSize(params: {
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  quality: number;
  speed: number;
}): number {
  const { width, height, fps, durationSeconds, quality, speed } = params;

  if (speed <= 0 || !Number.isFinite(speed)) return 0;
  if (width <= 0 || height <= 0 || fps <= 0 || durationSeconds <= 0) return 0;

  // Adjust duration for speed
  const effectiveDuration = durationSeconds / speed;

  // Total frames
  const totalFrames = Math.ceil(effectiveDuration * fps);

  // Bytes per pixel per frame — scaled by quality
  // At quality 100 → ~0.08 bytes/pixel/frame
  // At quality 50 → ~0.04 bytes/pixel/frame
  // At quality 1 → ~0.01 bytes/pixel/frame
  const qualityFactor = 0.01 + (quality / 100) * 0.07;

  const estimatedBytes = width * height * totalFrames * qualityFactor;

  return Math.round(estimatedBytes);
}

/**
 * Calculate the proportional height for a given max width
 */
export function calculateHeight(originalWidth: number, originalHeight: number, maxWidth: number): number {
  if (originalWidth <= 0) return originalHeight;
  if (maxWidth >= originalWidth) return originalHeight;
  const ratio = maxWidth / originalWidth;
  return Math.round(originalHeight * ratio);
}
