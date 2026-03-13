import { Toast, showToast } from "@raycast/api";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePinSvg } from "../hooks/use-pin-svg";
import { useRecentSvg } from "../hooks/use-recent-svg";
import { Category, Svg } from "../type";
import { fetchCategories, fetchSvgs } from "../utils/fetch";

interface AppContextProps {
  svgs: Svg[];
  categories: Category[];
  pinnedSvgIds: number[];
  pinSvg: (id: number, name: string) => Promise<void>;
  unPinSvg: (id: number, name: string) => Promise<void>;
  moveUpInPinned: (id: number, name: string) => Promise<void>;
  moveDownInPinned: (id: number, name: string) => Promise<void>;
  selectedItemKey?: string;
  focusGridItem: (svgId: number, key: string) => void;
  recentSvgIds: number[];
  addRecentSvgId: (id: number) => void;
  isLoading: boolean;
}

const defaultAppContext: AppContextProps = {
  svgs: [],
  categories: [],
  pinnedSvgIds: [],
  pinSvg: async () => {},
  unPinSvg: async () => {},
  moveUpInPinned: async () => {},
  moveDownInPinned: async () => {},
  selectedItemKey: undefined,
  focusGridItem: () => {},
  recentSvgIds: [],
  addRecentSvgId: () => {},
  isLoading: true,
};

export const AppContext = createContext<AppContextProps>(defaultAppContext);

export const useSvglExtension = () => {
  return useContext(AppContext);
};

export const SvglExtensionProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    isLoading: isLoadingPinnedSvg,
    pinnedSvgIds,
    loadPinnedSvg,
    pinSvg,
    unPinSvg,
    moveUpInPinned,
    moveDownInPinned,
  } = usePinSvg();
  const { isLoading: isLoadingRecentSvg, recentSvgIds, loadRecentSvg, addRecentSvgId } = useRecentSvg();
  const [isAPILoading, setIsAPILoading] = useState(true);
  const [svgs, setSvgs] = useState<Svg[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItemKey, setSelectedItemKey] = useState<string | undefined>();

  // Because in All view, SVG's ID would be used in the Pinned Section and the All Section, so we need to add a prefix to make it unique.
  // The key is bound in the Pinned Section with the prefix `pinned`, for example: `pinned_1`
  const focusGridItem = useCallback((svgId: number, key: string) => {
    setSelectedItemKey(`${key}_${svgId}`);
  }, []);

  useEffect(() => {
    loadPinnedSvg();
    loadRecentSvg();

    async function fetchData() {
      setIsAPILoading(true);
      try {
        const svgs = await fetchSvgs();
        const categories = await fetchCategories();
        setSvgs(svgs);
        setCategories(categories);
      } catch (error) {
        if (error instanceof Error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Loading Failed",
            message: error.message,
          });
        }
      }
      setIsAPILoading(false);
    }
    fetchData();
  }, []);

  return (
    <AppContext.Provider
      value={{
        svgs,
        categories,
        pinnedSvgIds,
        pinSvg,
        unPinSvg,
        moveUpInPinned,
        moveDownInPinned,
        selectedItemKey,
        focusGridItem,
        recentSvgIds,
        addRecentSvgId,
        isLoading: isLoadingPinnedSvg || isLoadingRecentSvg || isAPILoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
