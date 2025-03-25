export default function addIcon(props: { item: { updateType: any } }) {
  let icon = "";
  switch (props.item.updateType) {
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
