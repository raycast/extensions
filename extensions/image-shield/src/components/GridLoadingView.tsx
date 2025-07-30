import { Grid } from "@raycast/api";

interface GridLoadingViewProps {
  title?: string;
}

function GridLoadingView({ title = "Please wait..." }: GridLoadingViewProps) {
  return <Grid isLoading={true} navigationTitle={title} />;
}

export default GridLoadingView;
