import { Provider } from "./component/Provider";
import { T } from "./component/T";

export default function Command() {
  return (
    <Provider>
      <T />
    </Provider>
  );
}
