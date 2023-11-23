import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="bd3137b3-2d8c-4b3b-91d8-44f647aa0602" quickSearch={props.arguments?.search} />;
}
