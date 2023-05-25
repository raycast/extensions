import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="8c01f070-0f5b-4b1c-a45e-36ac52967484" quickSearch={props.arguments?.search} />;
}
