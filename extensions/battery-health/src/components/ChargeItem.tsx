import StatsListItem from "./StatsListItem";

const ChargeItem = (props: { currentCapacity: number; maxCapacity: number; chargerWattage?: number }) => {
  const formattedCapacity =
    props.currentCapacity && props.maxCapacity ? `${props.currentCapacity} mAh / ${props.maxCapacity} mAh` : "--";

  const formattedWattage = props.chargerWattage ? `${props.chargerWattage} W` : "--";

  const formatted = props.chargerWattage ? `${formattedCapacity} (${formattedWattage})` : formattedCapacity;

  return <StatsListItem label="Charge" value={formatted} />;
};

export default ChargeItem;
