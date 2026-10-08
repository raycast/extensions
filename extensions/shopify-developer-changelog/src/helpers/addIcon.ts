export default function addIcon(updateType?: string): string {
  let icon = "";
  switch (updateType) {
    case "New":
      icon = "✨";
      break;
    case "Update":
      icon = "🚀";
      break;
    case "Deprecation":
      icon = "💀";
      break;
    default:
      icon = "";
  }
  return icon;
}
