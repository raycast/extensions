import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="6cc3dde8-5e2b-4f7c-81e8-16fb3e2abb26" quickSearch={props.arguments?.search} />;
}
