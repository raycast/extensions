import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="f34b823f-fd22-4b17-940e-a306019d62d1" quickSearch={props.arguments?.search} />;
}
