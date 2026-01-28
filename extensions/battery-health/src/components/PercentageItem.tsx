import StatsListItem from "./StatsListItem";

const PercentageItem = (props: { percentage: number }) => {
  const formatted = props.percentage !== undefined && props.percentage <= 100 ? `${props.percentage} %` : "--";

  return <StatsListItem label="Percentage" value={formatted} />;
};

export default PercentageItem;
