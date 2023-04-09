import DocCheckPage from "./doccheck-page";

export default function OpenPage(props: { arguments: { prevtitle: string, prevurl: string, title: string, url: string }}) {
  return <DocCheckPage prevtitle={props.arguments.prevtitle} prevurl={props.arguments.prevurl} title={props.arguments.title} url={props.arguments.url} />;
}
