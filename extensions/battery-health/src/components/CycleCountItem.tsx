import StatsListItem from "./StatsListItem";

const CycleCountItem = (props: { cycles: number }) => {
  const cycles = props.cycles ? `${props.cycles}` : "--";

  return <StatsListItem label="Cycle Count" value={cycles} />;
};

export default CycleCountItem;
