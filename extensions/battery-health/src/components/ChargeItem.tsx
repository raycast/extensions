import StatsListItem from "./StatsListItem";

const ChargeItem = (props: { currentCapacity: number; maxCapacity: number; chargerWattage?: number }) => {
  const formatted =
    props.currentCapacity && props.maxCapacity ? `${props.currentCapacity} mAh / ${props.maxCapacity} mAh` : "--";

  return <StatsListItem label="Charge" value={formatted} />;
};

export default ChargeItem;
