import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="0ef85678-06e0-44fa-bced-85fc841613cb" quickSearch={props.arguments?.search} />;
}
