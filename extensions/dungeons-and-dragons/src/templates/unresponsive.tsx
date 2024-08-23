import { Detail } from "@raycast/api";
export default function Unresponsive() {
  return (
    <Detail
      markdown={`# Error from API \n Unfortunately the data returned from [dnd5eapi.co](https://dnd5eapi.co) was unresponsive. Please try again later.`}
    />
  );
}
