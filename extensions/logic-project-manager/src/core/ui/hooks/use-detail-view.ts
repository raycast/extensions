import { useCachedChoice } from "@/core/ui/hooks/use-cached-choice";

export type DetailMode = "detail" | "overview";
export type DetailDoc = "notes" | "lyrics";

const isDetailMode = (value: string): value is DetailMode => value === "detail" || value === "overview";
const isDetailDoc = (value: string): value is DetailDoc => value === "notes" || value === "lyrics";

// 记住右侧详情面板的开合，以及面板主体显示笔记还是歌词。两个键各自独立记忆，各界面互不影响。
export function useDetailView({
  viewModeKey,
  detailDocKey,
  defaultMode,
}: {
  viewModeKey: string;
  detailDocKey: string;
  defaultMode: DetailMode;
}) {
  const [mode, setMode] = useCachedChoice(viewModeKey, isDetailMode, defaultMode);
  const [detailDoc, setDetailDoc] = useCachedChoice(detailDocKey, isDetailDoc, "notes");

  return {
    showDetail: mode === "detail",
    toggleDetail: () => setMode(mode === "detail" ? "overview" : "detail"),
    detailDoc,
    toggleDetailDoc: () => setDetailDoc(detailDoc === "notes" ? "lyrics" : "notes"),
  };
}
