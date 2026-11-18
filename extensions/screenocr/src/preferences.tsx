import { LanguagesManagerList } from "./preferences/LanguageManager/LanguageManager";
import { WindowsLanguageManager } from "./preferences/WindowsLanguageManager";

export default function Command() {
  return process.platform === "win32" ? (
    <WindowsLanguageManager />
  ) : (
    <LanguagesManagerList />
  );
}
