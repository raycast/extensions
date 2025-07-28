import { Detail } from "@raycast/api";

export default function Command() {
  const markdown = `## Cobalt for Raycast

Cobalt for Raycast is an extension that allows you to use [cobalt.tools](cobalt.tools) through Raycast.

## Licensing
Cobalt for Raycast is available under the [MIT License](https://github.com/MonsPropre/cobalt-for-raycast/blob/main/LICENSE) and use the cobalt.tools API [by imput.net](imput.net) which is available under the [AGPL-3.0 License](https://github.com/imputnet/cobalt/blob/main/LICENSE).`;

  return <Detail markdown={markdown} />;
}
