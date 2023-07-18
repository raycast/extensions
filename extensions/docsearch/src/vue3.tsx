import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="3261c206-c4f0-42bd-b53e-af5b6addf350" quickSearch={props.arguments?.search} />;
}
