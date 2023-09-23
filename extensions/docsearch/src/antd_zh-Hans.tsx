import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="baf3801b-95f5-4800-b77e-13c97e98877e" quickSearch={props.arguments?.search} />;
}
