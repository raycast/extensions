import { apiKey } from "./api-key";
import { ApiKeyRequired, CreateCodeForm } from "./dynamic-code-views";

export default function CreateDynamicCode() {
  const key = apiKey();
  return key ? <CreateCodeForm apiKey={key} /> : <ApiKeyRequired />;
}
