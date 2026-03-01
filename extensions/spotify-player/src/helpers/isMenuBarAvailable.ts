export default function isMenuBarAvailable() {
  return process.platform !== "win32";
}
