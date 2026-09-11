import type { Image } from "@raycast/api";
import type { SourceProviderKey } from "./types";

export type ProviderMeta = {
  key: SourceProviderKey;
  title: string;
  brandColor: string;
  dropdownIcon: Image.ImageLike;
};

export const PROVIDERS: readonly ProviderMeta[] = [
  {
    key: "claude",
    title: "Claude Code",
    brandColor: "#D97757",
    dropdownIcon: "provider-claude.png",
  },
  {
    key: "codex",
    title: "Codex",
    brandColor: "#2D8EFF",
    dropdownIcon: "provider-codex.png",
  },
  {
    key: "cursor",
    title: "Cursor",
    brandColor: "#A8DFB6",
    dropdownIcon: "provider-cursor.png",
  },
];
