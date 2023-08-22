import { open, LaunchProps, popToRoot } from "@raycast/api";

export default function main(props: LaunchProps<{ arguments: Arguments.SearchAppStore }>) {
  const { query } = props.arguments;
  open(`macappstore://ax.search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?q=${query}`);
  popToRoot({ clearSearchBar: true });
}
