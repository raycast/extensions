import useLocalStorage from "@/hooks/useLocalStorage";

export type MusicSensitivity = { value: number; set: (value: number) => void };

/** Mic sensitivity for music modes, shared by the main list and the per-device submenu. */
const useMusicSensitivity = (): MusicSensitivity => {
  const { data, setData } = useLocalStorage<number>("musicSensitivity", 75);
  return { value: data ?? 75, set: (value) => setData(value) };
};

export default useMusicSensitivity;
