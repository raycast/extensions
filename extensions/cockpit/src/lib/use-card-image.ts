import { environment, Icon, type Image } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useEffect, useRef, useState } from "react";

const cardDirectory = join(environment.supportPath, "metric-card-images");

function removeLater(path: string): void {
  setTimeout(() => void unlink(path).catch(() => undefined), 30_000);
}

export function useCardImage(id: string, svg: string): Image.ImageLike {
  const [source, setSource] = useState<Image.ImageLike>(Icon.CircleProgress);
  const currentPath = useRef<string | undefined>(undefined);
  const instanceId = useRef(randomUUID().slice(0, 8)).current;

  useEffect(() => {
    let cancelled = false;
    const safeId = id.replace(/[^a-z0-9_-]/gi, "-");
    const digest = createHash("sha1").update(svg).digest("hex").slice(0, 12);
    const nextPath = join(cardDirectory, `${safeId}-${instanceId}-${digest}.svg`);

    void (async () => {
      try {
        await mkdir(cardDirectory, { recursive: true });
        await writeFile(nextPath, svg, "utf8");

        if (cancelled) {
          removeLater(nextPath);
          return;
        }

        const previousPath = currentPath.current;
        currentPath.current = nextPath;
        setSource(nextPath);
        if (previousPath && previousPath !== nextPath) removeLater(previousPath);
      } catch {
        // Keep the previous card image if a transient filesystem write fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, instanceId, svg]);

  useEffect(
    () => () => {
      if (currentPath.current) removeLater(currentPath.current);
    },
    [],
  );

  return source;
}
