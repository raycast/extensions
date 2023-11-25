import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="c17f1bd8-6479-4232-84d9-3e8666e0f5c4" quickSearch={props.arguments?.search} />;
}
