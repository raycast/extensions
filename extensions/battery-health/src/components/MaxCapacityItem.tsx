import StatsListItem from "./StatsListItem";

const MaxCapacityItem = (props: { health: number }) => {
  const health = props.health ? `${props.health}` : "--";

  return <StatsListItem label="Maximum Capacity" value={health} />;
};

export default MaxCapacityItem;
