import { useCallback, useEffect, useState } from "react";

export const getBunchesPreview = (title: string, tag: string, shortcut: string, content: string) => {
  const [bunchesPreview, setBunchesPreview] = useState<string>("");

  const fetchData = useCallback(async () => {
    const _bunchesPreview = `---
title: ${title}${tag.length === 0 ? "" : "\ntag: " + tag}${shortcut.length === 0 ? "" : "\nshortcut: " + shortcut}
---
${content}
`;
    setBunchesPreview(_bunchesPreview);
  }, [title, tag, shortcut, content]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { bunchesPreview: bunchesPreview };
};
