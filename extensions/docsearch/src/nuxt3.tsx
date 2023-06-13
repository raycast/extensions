import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="85dcc3c8-991c-4e4f-b0c7-a179a14f4da5" quickSearch={props.arguments?.search} />;
}
