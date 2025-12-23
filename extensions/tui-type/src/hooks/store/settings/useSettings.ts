import { create } from "zustand";
import {
  RenderMode,
  UpdateFreq,
  SvgSettings,
  TerminalSettings,
  Mode,
} from "../../../types";
import { DEFAULT_SVG } from "../../../config/svg-config";
import { DEFAULT_TERM } from "../../../config/terminal-config";
import { useCache } from "../../useCache";

const { getCached, setCached } = useCache();

interface SettingsState {
  mode: Mode;
  limit: number;
  language: string;
  renderMode: RenderMode;
  updateFreq: UpdateFreq;
  svgSettings: SvgSettings;
  termSettings: TerminalSettings;
  usePunctuation: boolean;
  useNumbers: boolean;

  setMode: (v: Mode) => void;
  setLimit: (v: number) => void;
  setLanguage: (v: string) => void;
  setRenderMode: (v: RenderMode) => void;
  setUpdateFreq: (v: UpdateFreq) => void;
  setSvgSettings: (v: SvgSettings) => void;
  setTermSettings: (v: TerminalSettings) => void;
  setUsePunctuation: (v: boolean) => void;
  setUseNumbers: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  mode: getCached("mode", "time"),
  limit: getCached("limit", 30),
  language: getCached("language", "english"),
  renderMode: getCached("renderMode", "svg"),
  updateFreq: getCached("updateFreq", "instant"),
  svgSettings: getCached("svgSettings", DEFAULT_SVG),
  termSettings: getCached("termSettings", DEFAULT_TERM),
  usePunctuation: getCached("usePunctuation", false),
  useNumbers: getCached("useNumbers", false),

  setMode: (v) => {
    set({ mode: v });
    setCached("mode", v);
  },
  setLimit: (v) => {
    set({ limit: v });
    setCached("limit", v);
  },
  setLanguage: (v) => {
    set({ language: v });
    setCached("language", v);
  },
  setRenderMode: (v) => {
    set({ renderMode: v });
    setCached("renderMode", v);
  },
  setUpdateFreq: (v) => {
    set({ updateFreq: v });
    setCached("updateFreq", v);
  },
  setSvgSettings: (v) => {
    set({ svgSettings: v });
    setCached("svgSettings", v);
  },
  setTermSettings: (v) => {
    set({ termSettings: v });
    setCached("termSettings", v);
  },
  setUsePunctuation: (v) => {
    set({ usePunctuation: v });
    setCached("usePunctuation", v);
  },
  setUseNumbers: (v) => {
    set({ useNumbers: v });
    setCached("useNumbers", v);
  },
}));
