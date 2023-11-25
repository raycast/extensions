import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="9ed920ac-6414-4c8a-878b-d2807fd7b800" quickSearch={props.arguments?.search} />;
}
