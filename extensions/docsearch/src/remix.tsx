import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="827c55c0-1181-4791-897e-2a852f0eb8b7" quickSearch={props.arguments?.search} />;
}
