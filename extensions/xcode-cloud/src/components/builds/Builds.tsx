import { Color, Icon, Image, List } from "@raycast/api";
import { ReactElement } from "react";
import { CiCompletionStatus, CiExecutionProgress } from "../../appstore-connect";
import { BuildRun } from "../../data/buildRun";
import { Product } from "../../data/product";

export function Builds(props: {
  isLoading: boolean;
  searchBarAccessory: ReactElement<List.Dropdown.Props>;
  product?: Product;
  builds?: BuildRun[];
}): JSX.Element {
  return (
    <List
      isLoading={props.isLoading}
      isShowingDetail={false}
      navigationTitle={props.product?.name}
      searchBarAccessory={props.searchBarAccessory}
    >
      {props.builds &&
        props.builds?.map((build) => (
          <List.Item
            key={build.id}
            id={build.id}
            icon={icon(build.progress, build.status)}
            title={`#${build.number}: ${build.title}`}
          />
        ))}
    </List>
  );
}

function icon(progress?: CiExecutionProgress, status?: CiCompletionStatus): Image.ImageLike {
  switch (progress) {
    case CiExecutionProgress.Pending:
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    case CiExecutionProgress.Running:
      return { source: Icon.CircleProgress, tintColor: Color.SecondaryText };
    case CiExecutionProgress.Complete:
      switch (status) {
        case CiCompletionStatus.Succeeded:
          return { source: Icon.CheckCircle, tintColor: Color.Green };
        case CiCompletionStatus.Failed:
          return { source: Icon.XMarkCircle, tintColor: Color.Red };
        case CiCompletionStatus.Errored:
          return { source: Icon.XMarkCircle, tintColor: Color.Red };
        case CiCompletionStatus.Canceled:
          return { source: Icon.Circle, tintColor: Color.Yellow };
        case CiCompletionStatus.Skipped:
          return { source: Icon.Circle, tintColor: Color.SecondaryText };
      }
  }

  return Icon.QuestionMarkCircle;
}
