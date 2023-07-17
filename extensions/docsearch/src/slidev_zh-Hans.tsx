import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="072393d1-fd1b-4d61-bcbe-8d613147f5b4" quickSearch={props.arguments?.search} />;
}
