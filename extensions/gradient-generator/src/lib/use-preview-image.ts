import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { useEffect, useState } from 'react';
import { Gradient } from '../types';
import { generatePng } from './grad';

type PreviewImage = {
  gradient: Gradient;
  url?: string;
  error?: string;
};

// Keep PNG bytes out of Detail.markdown. Published URLs can outlive React effects:
// Raycast exposes no image-read completion signal. Leave successful files in the
// OS temporary directory rather than unlinking a resource the host may still read.
export function usePreviewImage(gradient: Gradient) {
  const [image, setImage] = useState<PreviewImage>();
  useEffect(() => {
    let directory: string | undefined;
    try {
      const bytes = generatePng(gradient, 800, 480);
      directory = mkdtempSync(path.join(tmpdir(), 'raycast-gradient-preview-'));
      const file = path.join(directory, 'preview.png');
      writeFileSync(file, bytes, { mode: 0o600, flag: 'wx' });
      setImage({ gradient, url: pathToFileURL(file).href });
    } catch (error) {
      let message = error instanceof Error ? error.message : String(error);
      // Nothing was published: a partial write is safe to remove immediately.
      if (directory) {
        try {
          rmSync(directory, { recursive: true, force: true });
        } catch (cleanupError) {
          message += ` Temporary file cleanup failed: ${String(cleanupError)}`;
        }
      }
      setImage({
        gradient,
        error: message,
      });
    }
  }, [gradient]);
  return image?.gradient === gradient ? image : undefined;
}
