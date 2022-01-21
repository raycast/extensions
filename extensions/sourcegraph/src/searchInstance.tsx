import { Detail } from "@raycast/api";
import SearchCommand from "./components/search";
import { customSourcegraph } from "./sourcegraph";

export default function SearchInstance() {
  const src = customSourcegraph();
  if (!src) {
    return (
      <Detail
        navigationTitle="Invalid custom instance URL"
        markdown={"⚠️ No custom Sourcegraph instance configured - set one up in the extension preferences!"}
      />
    );
  }
  try {
    new URL(src.instance);
  } catch (e) {
    return (
      <Detail
        navigationTitle="Invalid custom instance URL"
        markdown={`⚠️ Instance URL '${src.instance}' is invalid: ${e}\n\nUpdate it in the extension preferences!`}
      />
    );
  }
  return SearchCommand(src);
}
