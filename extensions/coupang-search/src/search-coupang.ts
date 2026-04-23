import { closeMainWindow, LaunchProps, open, showHUD } from "@raycast/api";

type Arguments = {
  query: string;
};

function buildSearchUrl(query: string) {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const query = props.arguments.query.trim();

  if (!query) {
    await showHUD("검색어를 입력하세요");
    return;
  }

  await closeMainWindow();
  await open(buildSearchUrl(query));
  await showHUD(`쿠팡에서 "${query}" 검색`);
}
