import StatsListItem from "./StatsListItem";

const ConditionItem = (props: { pfStatus: number }) => {
  const status = props.pfStatus === 0 ? "Good" : "Failure";
  const formatted = props.pfStatus !== undefined ? `${status}` : "--";

  return <StatsListItem label="Condition" value={formatted} />;
};

export default ConditionItem;
