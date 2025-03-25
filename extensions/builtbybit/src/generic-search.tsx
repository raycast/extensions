import { LaunchProps, open } from "@raycast/api";

export default function Command(props: LaunchProps<{ arguments: Arguments.GenericSearch }>) {
  const { keyword, type } = props.arguments;
  const baseUrl = `https://builtbybit.com/search/?q=${keyword}`;

  switch (type) {
    case "everything":
      open(`${baseUrl}`);
      break;
    case "threads":
      open(`${baseUrl}&t=t`);
      break;
    case "wiki":
      open(`${baseUrl}&t=ewr_carta_page`);
      break;
    case "reports":
      open(`${baseUrl}&t=report_comment`);
      break;
    case "resources":
      open(`${baseUrl}&t=resource`);
      break;
    case "profilePosts":
      open(`${baseUrl}&t=profile_post`);
      break;
    case "tickets":
      open(`${baseUrl}&t=nf_tickets_message`);
      break;
    case "tags":
      open(`https://builtbybit.com/tags/${keyword}`);
      break;
    default:
      open(`${baseUrl}`);
      break;
  }
}
