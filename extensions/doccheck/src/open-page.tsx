import DocCheckPage from "./doccheck-page";

export default function OpenPage(props: { arguments: { title: string; prevurl: string; query: string } }) {
  return <DocCheckPage url={props.arguments.url} prevurl={props.arguments.prevurl} query={props.arguments.query} />;
}
