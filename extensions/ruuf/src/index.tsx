import { Form, LocalStorage } from "@raycast/api";
import { LocalStorageKey } from "./storage";

export default function Command() {
  return (
    <Form>
      <Form.TextArea id="cookie" title="Cookie" placeholder="Por favor ingresa tu cookie ruuf" onChange={(data) => {
        LocalStorage.setItem(LocalStorageKey.Cookie, data);
      }}/>
    </Form>
  );
}
