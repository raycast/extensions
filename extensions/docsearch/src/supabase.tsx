import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="47d9a612-06be-4684-84cb-23b602a458d5" quickSearch={props.arguments?.search} />;
}
