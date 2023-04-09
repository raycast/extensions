import DocCheckPage from "./doccheck-page";

export default function OpenPage(props: { arguments: { prevurl: string; title: string; url: string } }) {
  return (
    <DocCheckPage
      prevtitle={decodeURI(props.arguments?.prevurl?.split("/").pop()?.replace(/_/gm, " ") ?? "")}
      prevurl={props.arguments.prevurl}
      title={props.arguments.title}
      url={props.arguments.url}
    />
  );
}
