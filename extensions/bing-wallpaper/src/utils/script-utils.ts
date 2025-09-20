import { applyTo } from "../types/preferences";

export const scriptSetWallpaper = (path: string) => {
  return `
      set temp_folder to (POSIX path of "${path}")
      set q_temp_folder to quoted form of temp_folder
      
      set x to alias (POSIX file temp_folder)

      try
        tell application "System Events"
          tell ${applyTo} desktop
            set picture to (x as text)
            return "ok"
          end tell
        end tell
      on error
        return "error"
      end try
    `;
};
