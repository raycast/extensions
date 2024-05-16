import { render } from "@raycast/api";
import App from "./App";
import { ConfigProvider } from "./hooks/ConfigContext";

render(
  <ConfigProvider>
    <App />
  </ConfigProvider>,
);
